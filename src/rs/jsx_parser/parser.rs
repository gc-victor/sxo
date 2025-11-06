use std::iter::Peekable;
use std::str::Chars;

use crate::jsx_parser::types::{
    JSXAttribute, JSXAttributeValue, JSXNode, ParseError, ParseResult, ParseResultWithSpan,
};

// Token characters
const LEFT_ANGLE: char = '<';
const RIGHT_ANGLE: char = '>';
const FORWARD_SLASH: char = '/';
const LEFT_BRACE: char = '{';
const RIGHT_BRACE: char = '}';
const EQUALS: char = '=';
const DOUBLE_QUOTE: char = '"';
const SINGLE_QUOTE: char = '\'';
const UNDERSCORE: char = '_';
const DOLLAR_SIGN: char = '$';
const HYPHEN: char = '-';
const DOT: char = '.';

// Error messages
const ERR_EXPECT_CLOSE_ANGLE: &str = "Expected >";
const ERR_EXPECT_CLOSE_SLASH: &str = "Expected > after /";
const ERR_FRAGMENT_CLOSE: &str = "Expected > for fragment closing tag";
const ERR_MISMATCHED_TAG: &str = "Mismatched closing tag: expected {}, found {}";
const ERR_UNCLOSED_TAG: &str = "Unclosed tag: {}";
const ERR_EXPECT_IDENTIFIER: &str = "Expected identifier";
const ERR_UNTERMINATED_STRING: &str = "Unterminated string literal";
const ERR_EXPECT_STRING_OR_EXPR: &str = "Expected string or expression";
const ERR_UNCLOSED_EXPRESSION: &str = "Unclosed expression";

pub struct Parser<'a> {
    chars: Peekable<Chars<'a>>,
    pos: usize,
}

impl<'a> Parser<'a> {
    pub fn new(input: &'a str) -> Self {
        Self {
            chars: input.chars().peekable(),
            pos: 0,
        }
    }

    pub fn parse(&mut self) -> ParseResult {
        let mut nodes: Vec<JSXNode> = Vec::new();
        let mut errors: Vec<ParseError> = Vec::new();

        // Streaming collection with basic error recovery: on error, advance one byte and continue.
        loop {
            match self.parse_next_with_span() {
                Some(Ok((node, _span))) => {
                    nodes.push(node);
                }
                Some(Err(err)) => {
                    errors.push(err);
                    // Recovery: advance by one byte to avoid infinite loop and continue scanning
                    self.bump();
                }
                None => break,
            }
        }

        ParseResult { nodes, errors }
    }

    fn parse_element(&mut self) -> Result<JSXNode, String> {
        // Consume <
        self.bump();
        self.skip_whitespace();

        // Parse tag name
        let tag = self.parse_identifier()?;
        self.skip_whitespace();

        // Parse attributes
        let attributes = self.parse_attributes()?;
        self.skip_whitespace();

        // Handle self-closing tags
        if self.peek() == Some(FORWARD_SLASH) {
            self.bump();
            if self.peek() == Some(RIGHT_ANGLE) {
                self.bump();
                return Ok(JSXNode::Element {
                    tag,
                    attributes,
                    children: vec![],
                });
            }
            return Err(ERR_EXPECT_CLOSE_SLASH.to_string());
        }

        // Expect >
        if self.peek() != Some(RIGHT_ANGLE) {
            return Err(ERR_EXPECT_CLOSE_ANGLE.to_string());
        }
        self.bump();

        // Parse children
        let children = self.parse_children(&tag)?;

        Ok(JSXNode::Element {
            tag,
            attributes,
            children,
        })
    }

    fn parse_fragment(&mut self) -> Result<JSXNode, String> {
        // Consume <>
        self.bump();
        self.bump();

        let children = self.parse_children("fragment")?;

        Ok(JSXNode::Fragment { children })
    }

    fn parse_children(&mut self, parent_tag: &str) -> Result<Vec<JSXNode>, String> {
        let mut children = vec![];

        // Special handling for script tag - treat everything as text until closing tag
        if parent_tag == "script" {
            let mut content = String::new();

            while let Some(c) = self.peek() {
                if c == LEFT_ANGLE && self.peek_n(1) == Some(FORWARD_SLASH) {
                    let peek_pos = self.pos;
                    let peek_chars = self.chars.clone();

                    self.bump(); // <
                    self.bump(); // /
                    self.skip_whitespace();

                    if let Ok(tag) = self.parse_identifier() {
                        if tag == "script" {
                            self.skip_whitespace();
                            if self.peek() == Some(RIGHT_ANGLE) {
                                self.bump(); // >
                                break;
                            }
                        }
                    }

                    // Reset position and continue if not </script>
                    self.pos = peek_pos;
                    self.chars = peek_chars;
                    content.push(c);
                    self.bump();
                } else {
                    content.push(c);
                    self.bump();
                }
            }

            children.push(JSXNode::Text(content));
            return Ok(children);
        }

        loop {
            match self.peek() {
                Some(LEFT_ANGLE) => {
                    self.skip_whitespace();
                    if self.peek_n(1) == Some(FORWARD_SLASH) {
                        // End tag
                        self.bump(); // <
                        self.bump(); // /
                        self.skip_whitespace();

                        if parent_tag == "fragment" {
                            // For fragments, just expect >
                            if self.peek() != Some(RIGHT_ANGLE) {
                                return Err(ERR_FRAGMENT_CLOSE.to_string());
                            }
                            self.bump();
                            break;
                        } else {
                            // For normal elements, parse the closing tag identifier
                            let close_tag = self.parse_identifier()?;
                            if close_tag != parent_tag {
                                return Err(ERR_MISMATCHED_TAG
                                    .to_string()
                                    .replace("{}", parent_tag)
                                    .replace("{}", &close_tag));
                            }

                            self.skip_whitespace();
                            if self.peek() != Some(RIGHT_ANGLE) {
                                return Err(ERR_EXPECT_CLOSE_ANGLE.to_string());
                            }
                            self.bump();
                            break;
                        }
                    } else if self.peek_n(1) == Some(RIGHT_ANGLE) {
                        // Fragment
                        children.push(self.parse_fragment()?);
                    } else {
                        // Element
                        children.push(self.parse_element()?);
                    }
                }
                Some(LEFT_BRACE) => {
                    children.push(self.parse_expression()?);
                }
                Some(_) => {
                    children.push(self.parse_text()?);
                }
                None => {
                    return Err(ERR_UNCLOSED_TAG.to_string().replace("{}", parent_tag));
                }
            }
        }

        Ok(children)
    }

    fn parse_attributes(&mut self) -> Result<Vec<JSXAttribute>, String> {
        let mut attributes = vec![];

        while let Some(c) = self.peek() {
            if c == RIGHT_ANGLE || c == FORWARD_SLASH {
                break;
            }

            self.skip_whitespace();

            // Check for spread operator
            if self.check_sequence(&[DOT, DOT, DOT]) {
                // Consume the three dots
                self.bump();
                self.bump();
                self.bump();

                let name = match self.peek() {
                    Some(c) if c.is_ascii_alphabetic() || c == UNDERSCORE || c == DOLLAR_SIGN => {
                        let ident = self.parse_identifier()?;
                        format!("...{ident}")
                    }
                    _ => {
                        // Accept any JS expression until the matching '}' for spread attributes like {...(expr)}
                        let expr = self.parse_expression_content()?;
                        format!("...{expr}")
                    }
                };

                attributes.push(JSXAttribute { name, value: None });
                self.skip_whitespace();
                continue;
            }

            let name = match self.parse_identifier() {
                Ok(name) => name,
                Err(_) => {
                    // Only skip invalid character if it's not part of a spread operator
                    self.bump();
                    String::new()
                }
            };

            self.skip_whitespace();

            let value = if self.peek() == Some(EQUALS) {
                self.bump();
                self.skip_whitespace();
                Some(self.parse_attribute_value()?)
            } else {
                None
            };

            if !name.is_empty() {
                attributes.push(JSXAttribute { name, value });
            }

            self.skip_whitespace();
        }

        Ok(attributes)
    }

    #[inline]
    fn check_sequence(&mut self, chars: &[char]) -> bool {
        let mut chars_iter = self.chars.clone();

        for &expected_char in chars {
            match chars_iter.next() {
                Some(c) if c == expected_char => continue,
                _ => return false,
            }
        }

        true
    }

    fn parse_attribute_value(&mut self) -> Result<JSXAttributeValue, String> {
        match self.peek() {
            Some(DOUBLE_QUOTE) => {
                let quote = self.peek().unwrap();
                self.bump();
                let mut value = String::new();
                while let Some(c) = self.peek() {
                    if c == quote {
                        break;
                    }
                    value.push(c);
                    self.bump();
                }
                if self.peek() != Some(quote) {
                    return Err(ERR_UNTERMINATED_STRING.to_string());
                }
                self.bump();
                Ok(JSXAttributeValue::DoubleQuote(value))
            }
            Some(SINGLE_QUOTE) => {
                let quote = self.peek().unwrap();
                self.bump();
                let mut value = String::new();
                while let Some(c) = self.peek() {
                    if c == quote {
                        break;
                    }
                    value.push(c);
                    self.bump();
                }
                if self.peek() != Some(quote) {
                    return Err(ERR_UNTERMINATED_STRING.to_string());
                }
                self.bump();
                Ok(JSXAttributeValue::SingleQuote(value))
            }
            Some(LEFT_BRACE) => {
                self.bump();
                let expr = self.parse_expression_content()?;
                Ok(JSXAttributeValue::Expression(expr))
            }
            _ => Err(ERR_EXPECT_STRING_OR_EXPR.to_string()),
        }
    }

    fn parse_expression(&mut self) -> Result<JSXNode, String> {
        // Consume {
        self.bump();
        let expr = self.parse_expression_content()?;
        Ok(JSXNode::Expression(expr))
    }

    fn parse_expression_content(&mut self) -> Result<String, String> {
        let mut content = String::new();
        let mut brace_count = 1;

        while let Some(c) = self.peek() {
            match c {
                LEFT_BRACE => {
                    brace_count += 1;
                    content.push(c);
                }
                RIGHT_BRACE => {
                    brace_count -= 1;
                    if brace_count == 0 {
                        self.bump();
                        return Ok(content);
                    }
                    content.push(c);
                }
                _ => {
                    content.push(c);
                }
            }
            self.bump();
        }

        Err(ERR_UNCLOSED_EXPRESSION.to_string())
    }

    fn parse_text(&mut self) -> Result<JSXNode, String> {
        let mut content = String::new();

        while let Some(c) = self.peek() {
            if c == LEFT_ANGLE || c == LEFT_BRACE {
                break;
            }
            content.push(c);
            self.bump();
        }

        Ok(JSXNode::Text(content.to_string()))
    }

    fn parse_identifier(&mut self) -> Result<String, String> {
        let mut ident = String::new();

        if let Some(c) = self.peek() {
            if !c.is_ascii_alphabetic() && c != UNDERSCORE && c != DOLLAR_SIGN {
                return Err(ERR_EXPECT_IDENTIFIER.to_string());
            }
            ident.push(c);
            self.bump();
        }

        while let Some(c) = self.peek() {
            if c.is_alphanumeric() || c == UNDERSCORE || c == DOLLAR_SIGN || c == HYPHEN || c == DOT
            {
                ident.push(c);
                self.bump();
            } else {
                break;
            }
        }

        if ident.is_empty() {
            Err(ERR_EXPECT_IDENTIFIER.to_string())
        } else {
            Ok(ident)
        }
    }

    #[inline]
    fn peek(&mut self) -> Option<char> {
        self.chars.peek().copied()
    }

    #[inline]
    fn peek_n(&mut self, n: usize) -> Option<char> {
        let mut chars = self.chars.clone();
        for _ in 0..n {
            chars.next();
        }
        chars.next()
    }

    #[inline]
    fn bump(&mut self) {
        if let Some(c) = self.chars.next() {
            // Track position in bytes, not chars
            self.pos += c.len_utf8();
        }
    }

    #[inline]
    fn skip_whitespace(&mut self) {
        while let Some(c) = self.peek() {
            if !c.is_whitespace() {
                break;
            }
            self.bump();
        }
    }
}

impl<'a> Parser<'a> {
    /// Advance through the input and parse the next JSX node if found.
    /// Returns:
    /// - Some(Ok(node)) on success, with the parser advanced past the node
    /// - Some(Err(error)) if a JSX-like start was found but parsing failed
    /// - None if end of input was reached without finding any more JSX
    pub fn parse_next(&mut self) -> Option<Result<JSXNode, ParseError>> {
        loop {
            match self.peek() {
                None => return None,
                Some(LEFT_ANGLE) => {
                    // Fragment start: <>
                    if self.peek_n(1) == Some(RIGHT_ANGLE) {
                        let start = self.pos;
                        match self.parse_fragment() {
                            Ok(node) => return Some(Ok(node)),
                            Err(e) => return Some(Err(ParseError::new(start, e))),
                        }
                    // Element start: <[A-Za-z_$]
                    } else if self.is_valid_jsx_start_peek() {
                        let start = self.pos;
                        match self.parse_element() {
                            Ok(node) => return Some(Ok(node)),
                            Err(e) => return Some(Err(ParseError::new(start, e))),
                        }
                    } else {
                        // Invalid JSX start after '<'
                        let pos = self.pos;
                        return Some(Err(ParseError::new(pos, ERR_EXPECT_IDENTIFIER.to_string())));
                    }
                }
                _ => {
                    // Skip non-JSX content
                    self.bump();
                }
            }
        }
    }

    /// Like parse_next, but also returns the byte span (start, end) of the parsed node.
    pub fn parse_next_with_span(&mut self) -> Option<ParseResultWithSpan> {
        loop {
            match self.peek() {
                None => return None,
                Some(LEFT_ANGLE) => {
                    if self.peek_n(1) == Some(RIGHT_ANGLE) {
                        let start = self.pos;
                        match self.parse_fragment() {
                            Ok(node) => {
                                let end = self.pos;
                                return Some(Ok((node, (start, end))));
                            }
                            Err(e) => return Some(Err(ParseError::new(start, e))),
                        }
                    } else if self.is_valid_jsx_start_peek() {
                        let start = self.pos;
                        match self.parse_element() {
                            Ok(node) => {
                                let end = self.pos;
                                return Some(Ok((node, (start, end))));
                            }
                            Err(e) => return Some(Err(ParseError::new(start, e))),
                        }
                    } else {
                        // Invalid JSX start after '<'
                        let pos = self.pos;
                        return Some(Err(ParseError::new(pos, ERR_EXPECT_IDENTIFIER.to_string())));
                    }
                }
                _ => {
                    self.bump();
                }
            }
        }
    }

    #[inline]
    fn is_valid_jsx_start_peek(&mut self) -> bool {
        matches!(self.peek_n(1), Some(ch) if ch.is_ascii_alphabetic() || ch == UNDERSCORE || ch == DOLLAR_SIGN)
    }
}
