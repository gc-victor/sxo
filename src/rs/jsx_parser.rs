use std::iter::Peekable;
use std::str::Chars;

#[derive(Debug, PartialEq)]
pub enum JSXNode {
    Element {
        tag: String,
        attributes: Vec<JSXAttribute>,
        children: Vec<JSXNode>,
    },
    Fragment {
        children: Vec<JSXNode>,
    },
    Text(String),
    Expression(String),
}

#[derive(Debug, PartialEq)]
pub struct JSXAttribute {
    pub name: String,
    pub value: Option<JSXAttributeValue>,
}

#[derive(Debug, PartialEq)]
pub enum JSXAttributeValue {
    DoubleQuote(String),
    SingleQuote(String),
    Expression(String),
}

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

// Structured streaming parser error with position for recovery/aggregation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParseError {
    pub position: usize,
    pub message: String,
}

impl ParseError {
    #[inline]
    pub fn new(position: usize, message: impl Into<String>) -> Self {
        Self {
            position,
            message: message.into(),
        }
    }
}

/// Parse result including the AST node and its byte span (start, end).
pub type ParseResultWithSpan = Result<(JSXNode, (usize, usize)), ParseError>;

#[derive(Debug, Default, PartialEq)]
pub struct ParseResult {
    pub nodes: Vec<JSXNode>,
    pub errors: Vec<ParseError>,
}

impl ParseResult {
    /// Unwrap into a single JSXNode. Panics if errors exist or not exactly one root node.
    pub fn unwrap(self) -> JSXNode {
        assert!(
            self.errors.is_empty(),
            "ParseResult has errors: {:?}",
            self.errors
        );
        assert_eq!(
            self.nodes.len(),
            1,
            "Expected a single root node, got {}",
            self.nodes.len()
        );
        self.nodes.into_iter().next().unwrap()
    }

    /// Returns true when any parsing errors were collected.
    pub fn is_err(&self) -> bool {
        !self.errors.is_empty()
    }
}

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
const ERR_EXPECT_SPREAD_OPERATOR: &str = "Expected identifier after spread operator";

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

                let name = match self.parse_identifier() {
                    Ok(name) => format!("...{name}"),
                    Err(_) => return Err(ERR_EXPECT_SPREAD_OPERATOR.to_string()),
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
            if c.is_alphanumeric() || c == UNDERSCORE || c == DOLLAR_SIGN || c == HYPHEN {
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

// Visitor trait and traversal utilities for JSX AST.
// This decouples traversal from operations performed on nodes (e.g., transformations).
pub trait JSXVisitor {
    // Called before visiting children of an element
    fn enter_element(&mut self, _tag: &str, _attributes: &[JSXAttribute]) {}

    // Called after visiting children of an element
    fn exit_element(&mut self, _tag: &str) {}

    // Called before visiting children of a fragment
    fn enter_fragment(&mut self) {}

    // Called after visiting children of a fragment
    fn exit_fragment(&mut self) {}

    // Called for a text node
    fn visit_text(&mut self, _text: &str) {}

    // Called for an expression node
    fn visit_expression(&mut self, _expr: &str) {}
}

/// Walk a single JSX node, invoking visitor hooks appropriately.
/// The traversal order is:
/// - enter_element/enter_fragment
/// - children (depth-first)
/// - exit_element/exit_fragment
pub fn walk_node<V: JSXVisitor + ?Sized>(visitor: &mut V, node: &JSXNode) {
    match node {
        JSXNode::Element {
            tag,
            attributes,
            children,
        } => {
            visitor.enter_element(tag, attributes);
            for child in children {
                walk_node(visitor, child);
            }
            visitor.exit_element(tag);
        }
        JSXNode::Fragment { children } => {
            visitor.enter_fragment();
            for child in children {
                walk_node(visitor, child);
            }
            visitor.exit_fragment();
        }
        JSXNode::Text(text) => visitor.visit_text(text),
        JSXNode::Expression(expr) => visitor.visit_expression(expr),
    }
}

/// Walk a slice of JSX nodes in order.
pub fn walk_nodes<V: JSXVisitor + ?Sized>(visitor: &mut V, nodes: &[JSXNode]) {
    for node in nodes {
        walk_node(visitor, node);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_element() {
        let mut parser = Parser::new("<div>Hello</div>");
        let ast = parser.parse().unwrap();

        assert_eq!(
            ast,
            JSXNode::Element {
                tag: "div".to_string(),
                attributes: vec![],
                children: vec![JSXNode::Text("Hello".to_string())]
            }
        );
    }

    #[test]
    fn test_parse_attributes() {
        let mut parser = Parser::new(r#"<div className="container" id="main">Hello</div>"#);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { attributes, .. } => {
                assert_eq!(attributes.len(), 2);
                assert_eq!(attributes[0].name, "className");
                assert_eq!(
                    attributes[0].value,
                    Some(JSXAttributeValue::DoubleQuote("container".to_string()))
                );
                assert_eq!(attributes[1].name, "id");
                assert_eq!(
                    attributes[1].value,
                    Some(JSXAttributeValue::DoubleQuote("main".to_string()))
                );
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_attributes_with_quotes() {
        let mut parser = Parser::new(r#"<div class='single' data-test="double"></div>"#);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { attributes, .. } => {
                assert_eq!(attributes.len(), 2);

                // Check single quoted attribute
                match &attributes[0].value {
                    Some(JSXAttributeValue::SingleQuote(value)) => {
                        assert_eq!(value, "single");
                    }
                    _ => panic!("Expected single-quoted string attribute"),
                }

                // Check double quoted attribute
                match &attributes[1].value {
                    Some(JSXAttributeValue::DoubleQuote(value)) => {
                        assert_eq!(value, "double");
                    }
                    _ => panic!("Expected double-quoted string attribute"),
                }
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_children_whitespace() {
        let input = r#"<p>Normal text <strong>Bold text</strong> some text</p>"#;
        let mut parser = Parser::new(input);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { tag, children, .. } => {
                assert_eq!(tag, "p");
                assert_eq!(children.len(), 3);

                match &children[0] {
                    JSXNode::Text(text) => {
                        assert_eq!(text, "Normal text ");
                    }
                    _ => panic!("Expected text node"),
                }

                match &children[1] {
                    JSXNode::Element { tag, children, .. } => {
                        assert_eq!(tag, "strong");
                        assert_eq!(children[0], JSXNode::Text("Bold text".to_string()));
                    }
                    _ => panic!("Expected strong element"),
                }

                match &children[2] {
                    JSXNode::Text(text) => {
                        assert_eq!(text, " some text");
                    }
                    _ => panic!("Expected text node"),
                }
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_expression() {
        let mut parser = Parser::new("<div>{count + 1}</div>");
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { children, .. } => {
                assert_eq!(children.len(), 1);
                assert_eq!(children[0], JSXNode::Expression("count + 1".to_string()));
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_expression_string_template() {
        let mut parser = Parser::new("<div>{`template ${variable}`}</div>");
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { children, .. } => {
                assert_eq!(children.len(), 1);
                assert_eq!(
                    children[0],
                    JSXNode::Expression("`template ${variable}`".to_string())
                );
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_nested_elements() {
        let mut parser = Parser::new("<div><span>Hello</span><b>World</b></div>");
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { tag, children, .. } => {
                assert_eq!(tag, "div");
                assert_eq!(children.len(), 2);

                match &children[0] {
                    JSXNode::Element { tag, children, .. } => {
                        assert_eq!(tag, "span");
                        assert_eq!(children[0], JSXNode::Text("Hello".to_string()));
                    }
                    _ => panic!("Expected Element"),
                }

                match &children[1] {
                    JSXNode::Element { tag, children, .. } => {
                        assert_eq!(tag, "b");
                        assert_eq!(children[0], JSXNode::Text("World".to_string()));
                    }
                    _ => panic!("Expected Element"),
                }
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_fragment() {
        let mut parser = Parser::new("<><span>World</span></>");
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Fragment { children } => {
                assert_eq!(children.len(), 1);
                match &children[0] {
                    JSXNode::Element { tag, children, .. } => {
                        assert_eq!(tag, "span");
                        assert_eq!(children[0], JSXNode::Text("World".to_string()));
                    }
                    _ => panic!("Expected Element"),
                }
            }
            _ => panic!("Expected Fragment"),
        }
    }

    #[test]
    fn test_parse_self_closing_tag() {
        let mut parser = Parser::new(r#"<input type="text" />"#);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element {
                tag,
                attributes,
                children,
                ..
            } => {
                assert_eq!(tag, "input");
                assert_eq!(attributes.len(), 1);
                assert_eq!(attributes[0].name, "type");
                assert_eq!(
                    attributes[0].value,
                    Some(JSXAttributeValue::DoubleQuote("text".to_string()))
                );
                assert_eq!(children.len(), 0);
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_mixed_content() {
        let mut parser = Parser::new("<div>Hello {name}!</div>");
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { children, .. } => {
                assert_eq!(children.len(), 3);
                assert_eq!(children[0], JSXNode::Text("Hello ".to_string()));
                assert_eq!(children[1], JSXNode::Expression("name".to_string()));
                assert_eq!(children[2], JSXNode::Text("!".to_string()));
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_expression_in_attribute() {
        let mut parser = Parser::new(r#"<div className={classes}>Content</div>"#);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { attributes, .. } => {
                assert_eq!(attributes.len(), 1);
                assert_eq!(attributes[0].name, "className");
                assert_eq!(
                    attributes[0].value,
                    Some(JSXAttributeValue::Expression("classes".to_string()))
                );
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_boolean_attribute() {
        let mut parser = Parser::new("<button disabled>Click me</button>");
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { attributes, .. } => {
                assert_eq!(attributes.len(), 1);
                assert_eq!(attributes[0].name, "disabled");
                assert_eq!(attributes[0].value, None);
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_multiple_attributes() {
        let mut parser = Parser::new(
            r#"<div id="main" className={classes} data-test="value" disabled>{content}</div>"#,
        );
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element {
                attributes,
                children,
                ..
            } => {
                assert_eq!(attributes.len(), 4);

                assert_eq!(attributes[0].name, "id");
                assert_eq!(
                    attributes[0].value,
                    Some(JSXAttributeValue::DoubleQuote("main".to_string()))
                );

                assert_eq!(attributes[1].name, "className");
                assert_eq!(
                    attributes[1].value,
                    Some(JSXAttributeValue::Expression("classes".to_string()))
                );

                assert_eq!(attributes[2].name, "data-test");
                assert_eq!(
                    attributes[2].value,
                    Some(JSXAttributeValue::DoubleQuote("value".to_string()))
                );

                assert_eq!(attributes[3].name, "disabled");
                assert_eq!(attributes[3].value, None);

                assert_eq!(children.len(), 1);
                assert_eq!(children[0], JSXNode::Expression("content".to_string()));
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_componet() {
        let mut parser = Parser::new(r#"<Custom data-test="value"></Custom>"#);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element {
                tag, attributes, ..
            } => {
                assert_eq!(tag, "Custom");
                assert_eq!(attributes.len(), 1);
                assert_eq!(attributes[0].name, "data-test");
                assert_eq!(
                    attributes[0].value,
                    Some(JSXAttributeValue::DoubleQuote("value".to_string()))
                );
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_component_with_underscore() {
        let mut parser = Parser::new("<my_component>Content</my_component>");
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { tag, children, .. } => {
                assert_eq!(tag, "my_component");
                assert_eq!(children[0], JSXNode::Text("Content".to_string()));
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_component_with_dollar_sign() {
        let mut parser = Parser::new("<$MyComponent prop={value}>Content</$MyComponent>");
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element {
                tag,
                attributes,
                children,
            } => {
                assert_eq!(tag, "$MyComponent");
                assert_eq!(attributes[0].name, "prop");
                assert_eq!(
                    attributes[0].value,
                    Some(JSXAttributeValue::Expression("value".to_string()))
                );
                assert_eq!(children[0], JSXNode::Text("Content".to_string()));
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_nested_underscore_components() {
        let mut parser = Parser::new("<outer_comp><inner_comp>Test</inner_comp></outer_comp>");
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { tag, children, .. } => {
                assert_eq!(tag, "outer_comp");
                match &children[0] {
                    JSXNode::Element { tag, children, .. } => {
                        assert_eq!(tag, "inner_comp");
                        assert_eq!(children[0], JSXNode::Text("Test".to_string()));
                    }
                    _ => panic!("Expected inner element"),
                }
            }
            _ => panic!("Expected outer element"),
        }
    }

    #[test]
    fn test_parse_complex_identifier_names() {
        let mut parser = Parser::new(r#"<_$MY_component_123 data-test="value" />"#);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element {
                tag,
                attributes,
                children,
            } => {
                assert_eq!(tag, "_$MY_component_123");
                assert_eq!(attributes[0].name, "data-test");
                assert_eq!(
                    attributes[0].value,
                    Some(JSXAttributeValue::DoubleQuote("value".to_string()))
                );
                assert_eq!(children.len(), 0);
            }
            e => panic!("Expected Element {e:?}"),
        }
    }

    #[test]
    fn test_parse_nested_structure() {
        let mut parser = Parser::new("<div className=\"container\"><header><h1>{title}</h1><nav><a href=\"/\">Home</a><a href=\"/about\">About</a></nav></header></div>");
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element {
                tag,
                attributes,
                children,
                ..
            } => {
                assert_eq!(tag, "div");
                assert_eq!(attributes.len(), 1);
                assert_eq!(attributes[0].name, "className");
                assert_eq!(
                    attributes[0].value,
                    Some(JSXAttributeValue::DoubleQuote("container".to_string()))
                );

                // Check header
                let meaningful_children: Vec<&JSXNode> = children
                    .iter()
                    .filter(|node| match node {
                        JSXNode::Text(text) => !text.trim().is_empty(),
                        _ => true,
                    })
                    .collect();

                match &meaningful_children[0] {
                    JSXNode::Element { tag, children, .. } => {
                        assert_eq!(tag, "header");

                        // Check h1
                        let header_meaningful_children: Vec<&JSXNode> = children
                            .iter()
                            .filter(|node| match node {
                                JSXNode::Text(text) => !text.trim().is_empty(),
                                _ => true,
                            })
                            .collect();

                        match &header_meaningful_children[0] {
                            JSXNode::Element { tag, children, .. } => {
                                assert_eq!(tag, "h1");
                                assert_eq!(children[0], JSXNode::Expression("title".to_string()));
                            }
                            _ => panic!("Expected h1 element"),
                        }

                        // Check nav
                        match &header_meaningful_children[1] {
                            JSXNode::Element { tag, children, .. } => {
                                assert_eq!(tag, "nav");

                                // Check first anchor
                                let nav_meaningful_children: Vec<&JSXNode> = children
                                    .iter()
                                    .filter(|node| match node {
                                        JSXNode::Text(text) => !text.trim().is_empty(),
                                        _ => true,
                                    })
                                    .collect();

                                match &nav_meaningful_children[0] {
                                    JSXNode::Element {
                                        tag,
                                        attributes,
                                        children,
                                        ..
                                    } => {
                                        assert_eq!(tag, "a");
                                        assert_eq!(attributes[0].name, "href");
                                        assert_eq!(
                                            attributes[0].value,
                                            Some(JSXAttributeValue::DoubleQuote("/".to_string()))
                                        );
                                        assert_eq!(children[0], JSXNode::Text("Home".to_string()));
                                    }
                                    _ => panic!("Expected first anchor element"),
                                }

                                // Check second anchor
                                match &nav_meaningful_children[1] {
                                    JSXNode::Element {
                                        tag,
                                        attributes,
                                        children,
                                        ..
                                    } => {
                                        assert_eq!(tag, "a");
                                        assert_eq!(attributes[0].name, "href");
                                        assert_eq!(
                                            attributes[0].value,
                                            Some(JSXAttributeValue::DoubleQuote(
                                                "/about".to_string()
                                            ))
                                        );
                                        assert_eq!(children[0], JSXNode::Text("About".to_string()));
                                    }
                                    _ => panic!("Expected second anchor element"),
                                }
                            }
                            _ => panic!("Expected nav element"),
                        }
                    }
                    _ => panic!("Expected header element"),
                }
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_list_map() {
        let mut parser = Parser::new("<ul>{items.map(item => <li>{item.name}</li>)}</ul>");
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { tag, children, .. } => {
                assert_eq!(tag, "ul");
                assert_eq!(children.len(), 1);
                match &children[0] {
                    JSXNode::Expression(expr) => {
                        assert_eq!(expr, "items.map(item => <li>{item.name}</li>)");
                    }
                    _ => panic!("Expected Expression"),
                }
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_template_string() {
        let mut parser = Parser::new(r#"<div style={`color: ${color}; background: ${bg}`}></div>"#);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { attributes, .. } => {
                assert_eq!(attributes.len(), 1);
                assert_eq!(attributes[0].name, "style");
                match &attributes[0].value {
                    Some(JSXAttributeValue::Expression(expr)) => {
                        assert_eq!(expr, "`color: ${color}; background: ${bg}`");
                    }
                    _ => panic!("Expected Expression attribute value"),
                }
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_fragment_with_nested_structure() {
        let input = "<><div>Content</div></>";
        let mut parser = Parser::new(input);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Fragment { children } => {
                assert_eq!(children.len(), 1);
                match &children[0] {
                    JSXNode::Element { tag, children, .. } => {
                        assert_eq!(tag, "div");
                        assert_eq!(children[0], JSXNode::Text("Content".to_string()));
                    }
                    _ => panic!("Expected div element"),
                }
            }
            _ => panic!("Expected Fragment"),
        }
    }

    #[test]
    fn test_complex_attributes() {
        let input =
            r#"<div className={`container ${active ? 'active' : ''}`} data-test="value"></div>"#;
        let mut parser = Parser::new(input);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element {
                tag, attributes, ..
            } => {
                assert_eq!(tag, "div");
                assert_eq!(attributes.len(), 2);

                assert_eq!(attributes[0].name, "className");
                match &attributes[0].value {
                    Some(JSXAttributeValue::Expression(expr)) => {
                        assert_eq!(expr, "`container ${active ? 'active' : ''}`");
                    }
                    _ => panic!("Expected className expression"),
                }

                assert_eq!(attributes[1].name, "data-test");
                assert_eq!(
                    attributes[1].value,
                    Some(JSXAttributeValue::DoubleQuote("value".to_string()))
                );
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_spread_props() {
        let input = r#"<input {...spreadProps} />"#;
        let mut parser = Parser::new(input);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { attributes, .. } => {
                let spread_attr = &attributes[0];
                assert_eq!(spread_attr.name, "...spreadProps");
                assert_eq!(spread_attr.value, None);
            }
            _ => panic!("Expected Spread Props"),
        }
    }

    #[test]
    fn test_conditional_rendering() {
        let input = r#"<div>{loading ? <Spinner size="large" /> : <Content />}</div>"#;
        let mut parser = Parser::new(input);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { tag, children, .. } => {
                assert_eq!(tag, "div");
                assert_eq!(children.len(), 1);
                match &children[0] {
                    JSXNode::Expression(expr) => {
                        assert_eq!(expr, r#"loading ? <Spinner size="large" /> : <Content />"#);
                    }
                    _ => panic!("Expected Expression"),
                }
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_component_with_multiple_props() {
        let input = r#"<CustomComponent prop1="string" prop2={value} prop3 />"#;
        let mut parser = Parser::new(input);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element {
                tag,
                attributes,
                children,
            } => {
                assert_eq!(tag, "CustomComponent");
                assert_eq!(attributes.len(), 3);

                assert_eq!(attributes[0].name, "prop1");
                assert_eq!(
                    attributes[0].value,
                    Some(JSXAttributeValue::DoubleQuote("string".to_string()))
                );

                assert_eq!(attributes[1].name, "prop2");
                assert_eq!(
                    attributes[1].value,
                    Some(JSXAttributeValue::Expression("value".to_string()))
                );

                assert_eq!(attributes[2].name, "prop3");
                assert_eq!(attributes[2].value, None);

                assert_eq!(children.len(), 0);
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_list_mapping() {
        let input = r#"<div>{items.map((item, index) => <Item key={index} data={item} />)}</div>"#;
        let mut parser = Parser::new(input);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { tag, children, .. } => {
                assert_eq!(tag, "div");
                assert_eq!(children.len(), 1);
                match &children[0] {
                    JSXNode::Expression(expr) => {
                        assert_eq!(
                            expr,
                            "items.map((item, index) => <Item key={index} data={item} />)"
                        );
                    }
                    _ => panic!("Expected Expression"),
                }
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_before_and_after_script() {
        let input = r#"<div>
        <p>Before Script</p>
        <script>
            function greet() {
                console.log("Hello World");
            }
        </script>
        <p>After Script</p>
    </div>"#;

        let mut parser = Parser::new(input);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { tag, children, .. } => {
                assert_eq!(tag, "div");

                // Filter out empty text nodes
                let filtered_children: Vec<&JSXNode> = children
                    .iter()
                    .filter(|node| match node {
                        JSXNode::Text(text) => !text.trim().is_empty(),
                        _ => true,
                    })
                    .collect();

                assert_eq!(filtered_children.len(), 3);

                match filtered_children[0] {
                    JSXNode::Element { tag, children, .. } => {
                        assert_eq!(tag, "p");
                        assert_eq!(children[0], JSXNode::Text("Before Script".to_string()));
                    }
                    _ => panic!("Expected p element"),
                }

                match filtered_children[1] {
                    JSXNode::Element { tag, children, .. } => {
                        assert_eq!(tag, "script");
                        match &children[0] {
                            JSXNode::Text(text) => {
                                assert_eq!(
                                    text.trim(),
                                    r#"function greet() {
                console.log("Hello World");
            }"#
                                );
                            }
                            _ => panic!("Expected text node in script"),
                        }
                    }
                    _ => panic!("Expected script element"),
                }

                match filtered_children[2] {
                    JSXNode::Element { tag, children, .. } => {
                        assert_eq!(tag, "p");
                        assert_eq!(children[0], JSXNode::Text("After Script".to_string()));
                    }
                    _ => panic!("Expected p element"),
                }
            }
            _ => panic!("Expected root element"),
        }
    }

    #[test]
    fn test_parse_script_tag_with_html_as_string() {
        let input = r#"<script data-hot-replace="true">
const copyClipboardButton = document.getElementById("js-copyClipboardButton");
const code = copyClipboardButton.querySelector("code");
const originalInnerHTML = copyClipboardButton.innerHTML;

let timeout;

copyClipboardButton.addEventListener("click", () => {
clearTimeout(timeout);
navigator.clipboard.writeText(code.textContent)
.then(() => {
copyClipboardButton.innerHTML = "<span class=\"text-sm font-mono mr-2\">Copied!</span>";
timeout = setTimeout(() => {
copyClipboardButton.innerHTML = originalInnerHTML;
}, 1000);
})
.catch(err => {
console.error("Failed to copy: ", err);
});
});
        </script>"#;

        let mut parser = Parser::new(input);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { tag, children, .. } => {
                assert_eq!(tag, "script");
                assert_eq!(children.len(), 1);

                match &children[0] {
                    JSXNode::Text(text) => {
                        let expected = r#"
const copyClipboardButton = document.getElementById("js-copyClipboardButton");
const code = copyClipboardButton.querySelector("code");
const originalInnerHTML = copyClipboardButton.innerHTML;

let timeout;

copyClipboardButton.addEventListener("click", () => {
clearTimeout(timeout);
navigator.clipboard.writeText(code.textContent)
.then(() => {
copyClipboardButton.innerHTML = "<span class=\"text-sm font-mono mr-2\">Copied!</span>";
timeout = setTimeout(() => {
copyClipboardButton.innerHTML = originalInnerHTML;
}, 1000);
})
.catch(err => {
console.error("Failed to copy: ", err);
});
});"#;
                        assert_eq!(text.trim(), expected.trim());
                    }
                    _ => panic!("Expected Text node"),
                }
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_collects_multiple_errors() {
        // Mismatched closing tag + unterminated attribute string → two distinct errors
        let input = r#"<div><span>Test</div><div class="oops>Bad</div>"#;
        let mut parser = Parser::new(input);
        let result = parser.parse();
        
        eprintln!("Error: {:?}", result);
        
        assert!(result.is_err(), "Expected parse errors");
        assert!(
            result.errors.len() >= 2,
            "Expected at least two errors, got {}: {:?}",
            result.errors.len(),
            result.errors
        );
        let messages = result
            .errors
            .iter()
            .map(|e| e.message.as_str())
            .collect::<Vec<_>>();
        assert!(
            messages
                .iter()
                .any(|m| m.contains("Mismatched closing tag")),
            "Missing mismatched tag error in: {:?}",
            messages
        );
        assert!(
            messages
                .iter()
                .any(|m| m.contains("Unterminated string literal")),
            "Missing unterminated string error in: {:?}",
            messages
        );
        // Positions should be non-negative and increasing or equal (monotonic non-decreasing)
        for w in result.errors.windows(2) {
            assert!(
                w[0].position <= w[1].position,
                "Error positions not monotonic: {:?}",
                result.errors
            );
        }
    }

    #[test]
    fn test_parse_result_unwrap_and_is_err() {
        // Valid JSX: unwrap should succeed and is_err should be false
        let mut ok_parser = Parser::new("<div>Hello</div>");
        let ast = ok_parser.parse().unwrap();
        match ast {
            JSXNode::Element { tag, children, .. } => {
                assert_eq!(tag, "div");
                assert_eq!(children.len(), 1);
            }
            _ => panic!("Expected Element"),
        }

        // Invalid JSX: is_err should be true
        let mut err_parser = Parser::new("<div>{count</div>");
        let res = err_parser.parse();

        assert!(res.is_err(), "Expected error on unclosed expression");
    }

    #[test]
    fn test_parse_complex_nested_structure() {
        let input = r#"<div className={`container ${active ? 'active' : ''}`} data-test="value">
            <header id="main">
                <h1 className="title" hidden>{title || "Default"}</h1>
                {loading ? (
                    <Spinner size="large" />
                ) : (
                    <nav>
                        <a href="/" className={styles.link}>Home</a>
                        {items.map((item, index) => (
                            <a key={index} href={`/item/${item.id}`}>
                                {`Item ${item.name}`}
                                <span>{item.count}</span>
                            </a>
                        ))}
                    </nav>
                )}
            </header>
        </div>"#;
        let mut parser = Parser::new(input);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element {
                tag,
                attributes,
                children,
            } => {
                assert_eq!(tag, "div");
                assert_eq!(attributes.len(), 2);

                // Verify div attributes
                assert_eq!(attributes[0].name, "className");
                match &attributes[0].value {
                    Some(JSXAttributeValue::Expression(expr)) => {
                        assert_eq!(expr, "`container ${active ? 'active' : ''}`");
                    }
                    _ => panic!("Expected className expression"),
                }
                assert_eq!(attributes[1].name, "data-test");
                assert_eq!(
                    attributes[1].value,
                    Some(JSXAttributeValue::DoubleQuote("value".to_string()))
                );

                // Check header element
                let header = children
                    .iter()
                    .find(|child| {
                        if let JSXNode::Element { tag, .. } = child {
                            tag == "header"
                        } else {
                            false
                        }
                    })
                    .expect("Expected to find header element");

                match header {
                    JSXNode::Element {
                        tag,
                        attributes,
                        children,
                    } => {
                        assert_eq!(tag, "header");
                        assert_eq!(attributes.len(), 1);
                        assert_eq!(attributes[0].name, "id");
                        assert_eq!(
                            attributes[0].value,
                            Some(JSXAttributeValue::DoubleQuote("main".to_string()))
                        );

                        // Find and check h1 element
                        let h1 = children
                            .iter()
                            .find(|child| {
                                if let JSXNode::Element { tag, .. } = child {
                                    tag == "h1"
                                } else {
                                    false
                                }
                            })
                            .expect("Expected to find h1 element");

                        match h1 {
                            JSXNode::Element {
                                tag,
                                attributes,
                                children,
                            } => {
                                assert_eq!(tag, "h1");
                                assert_eq!(attributes.len(), 2);
                                assert_eq!(attributes[0].name, "className");
                                assert_eq!(attributes[1].name, "hidden");
                                assert_eq!(attributes[1].value, None);
                                assert_eq!(
                                    children[0],
                                    JSXNode::Expression("title || \"Default\"".to_string())
                                );
                            }
                            _ => panic!("Expected h1 element"),
                        }

                        // Verify the conditional expression is present
                        let conditional = children
                            .iter()
                            .find(|child| matches!(child, JSXNode::Expression(_)))
                            .expect("Expected to find conditional expression");

                        match conditional {
                            JSXNode::Expression(expr) => {
                                assert!(expr.contains("loading ?"));
                                assert!(expr.contains("<Spinner size=\"large\" />"));
                                assert!(expr.contains("<nav>"));
                            }
                            _ => panic!("Expected conditional expression"),
                        }
                    }
                    _ => panic!("Expected header element"),
                }
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_conditional_expressions() {
        let input = "<div>{condition && <div>Conditional Content</div>}{items.length === 0 ? <EmptyState /> : <List items={items} />}</div>";
        let mut parser = Parser::new(input);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element { tag, children, .. } => {
                assert_eq!(tag, "div");

                // Filter out whitespace nodes
                let meaningful_children: Vec<&JSXNode> = children
                    .iter()
                    .filter(|node| match node {
                        JSXNode::Text(text) => !text.trim().is_empty(),
                        _ => true,
                    })
                    .collect();

                assert_eq!(meaningful_children.len(), 2);

                match &meaningful_children[0] {
                    JSXNode::Expression(expr) => {
                        assert_eq!(expr, "condition && <div>Conditional Content</div>");
                    }
                    _ => panic!("Expected condition expression"),
                }

                match &meaningful_children[1] {
                    JSXNode::Expression(expr) => {
                        assert_eq!(
                            expr,
                            "items.length === 0 ? <EmptyState /> : <List items={items} />"
                        );
                    }
                    _ => panic!("Expected ternary expression"),
                }
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_component_with_spread_props() {
        let input = r#"<CustomComponent
            prop1="string"
            prop2={value}
            prop3
            {...spreadProps}
            onEvent={() => handleEvent()}
        />"#;
        let mut parser = Parser::new(input);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element {
                tag,
                attributes,
                children,
            } => {
                assert_eq!(tag, "CustomComponent");
                assert_eq!(children.len(), 0);

                let spread_attr = &attributes[3];
                assert_eq!(spread_attr.name, "...spreadProps");
                assert_eq!(spread_attr.value, None);

                let event_attr = &attributes[4];
                assert_eq!(event_attr.name, "onEvent");
                assert_eq!(
                    event_attr.value,
                    Some(JSXAttributeValue::Expression(
                        "() => handleEvent()".to_string()
                    ))
                );
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_dynamic_attributes() {
        let input = "<section data-section={section}><a href={`/item/${item.id}`} className={styles.link.toc}>{`Item ${item.name}`}</a></section>";
        let mut parser = Parser::new(input);
        let ast = parser.parse().unwrap();

        match ast {
            JSXNode::Element {
                tag,
                attributes,
                children,
            } => {
                assert_eq!(tag, "section");
                assert_eq!(attributes.len(), 1);
                assert_eq!(attributes[0].name, "data-section");
                assert_eq!(
                    attributes[0].value,
                    Some(JSXAttributeValue::Expression("section".to_string()))
                );

                let meaningful_children: Vec<&JSXNode> = children
                    .iter()
                    .filter(|node| match node {
                        JSXNode::Text(text) => !text.trim().is_empty(),
                        _ => true,
                    })
                    .collect();

                assert_eq!(meaningful_children.len(), 1);
                match &meaningful_children[0] {
                    JSXNode::Element {
                        tag,
                        attributes,
                        children,
                    } => {
                        assert_eq!(tag, "a");
                        assert_eq!(attributes.len(), 2);
                        assert_eq!(attributes[0].name, "href");
                        match &attributes[0].value {
                            Some(JSXAttributeValue::Expression(expr)) => {
                                assert_eq!(expr, "`/item/${item.id}`");
                            }
                            _ => panic!("Expected href expression"),
                        }

                        assert_eq!(children.len(), 1);
                        assert_eq!(
                            children[0],
                            JSXNode::Expression("`Item ${item.name}`".to_string())
                        );
                    }
                    _ => panic!("Expected anchor element"),
                }
            }
            _ => panic!("Expected Element"),
        }
    }

    #[test]
    fn test_parse_complex_layout_with_conditionals() {
        let input = r#"<div className={`container ${theme}`}>
                    <header className={styles.header}>
                        <h1>{title || "Default Title"}</h1>
                        <nav>
                            {menuItems.map((item, index) => (
                                <a
                                    key={index}
                                    href={item.href}
                                    className={`${styles.link} ${currentPath === item.href ? styles.active : ''}`}
                                >
                                    {item.icon && <Icon name={item.icon} />}
                                    <span>{item.label}</span>
                                    {item.badge && (
                                        <Badge count={item.badge} type={item.badgeType} />
                                    )}
                                </a>
                            ))}
                        </nav>
                        {user ? (
                            <div className={styles.userMenu}>
                                <img src={user.avatar} alt="User avatar" />
                                <span>{user.name}</span>
                                <button onClick={handleLogout}>Logout</button>
                            </div>
                        ) : (
                            <button className={styles.loginButton} onClick={handleLogin}>
                                Login
                            </button>
                        )}
                    </header>
                    <main className={styles.main}>
                        {loading ? (
                            <div className={styles.loader}>
                                <Spinner size="large" color={theme === 'dark' ? 'white' : 'black'} />
                            </div>
                        ) : error ? (
                            <ErrorMessage message={error} onRetry={handleRetry} />
                        ) : (
                            <>{children}</>
                        )}
                    </main>
                    <footer className={styles.footer}>
                        <p>&copy; {currentYear} My Application</p>
                    </footer>
                </div>
            ;"#;
        let mut parser = Parser::new(input);
        let ast = parser.parse().unwrap();

        fn assert_class_name(attributes: &[JSXAttribute], expected_value: &str) {
            assert_eq!(attributes[0].name, "className");
            assert_eq!(
                attributes[0].value,
                Some(JSXAttributeValue::Expression(expected_value.to_string()))
            );
        }

        if let JSXNode::Element {
            tag,
            attributes,
            children,
        } = ast
        {
            assert_eq!(tag, "div");
            assert_eq!(attributes.len(), 1);
            assert_class_name(&attributes, "`container ${theme}`");

            let nodes = children
                .iter()
                .filter(|n| !matches!(n, JSXNode::Text(t) if t.trim().is_empty()))
                .collect::<Vec<_>>();

            // Header assertions
            if let JSXNode::Element {
                tag,
                attributes,
                children,
            } = nodes[0]
            {
                assert_eq!(tag, "header");
                assert_class_name(attributes, "styles.header");

                let header_nodes = children
                    .iter()
                    .filter(|n| !matches!(n, JSXNode::Text(t) if t.trim().is_empty()))
                    .collect::<Vec<_>>();

                // Assert key elements exist with correct content
                assert!(matches!(header_nodes[0], JSXNode::Element { tag, .. } if tag == "h1"));
                assert!(matches!(header_nodes[1], JSXNode::Element { tag, .. } if tag == "nav"));

                if let JSXNode::Expression(expr) = header_nodes[2] {
                    assert!(expr.contains("user ?"));
                    assert!(expr.contains("styles.userMenu"));
                    assert!(expr.contains("styles.loginButton"));
                }
            }

            // Main assertions
            if let JSXNode::Element {
                tag,
                attributes,
                children,
            } = nodes[1]
            {
                assert_eq!(tag, "main");
                assert_class_name(attributes, "styles.main");

                if let JSXNode::Expression(expr) = &children[0] {
                    assert!(expr.contains("loading ?"));
                    assert!(expr.contains("<ErrorMessage"));
                }
            }

            // Footer assertions
            if let JSXNode::Element {
                tag,
                attributes,
                children,
            } = nodes[2]
            {
                assert_eq!(tag, "footer");
                assert_class_name(attributes, "styles.footer");

                if let JSXNode::Element { children, .. } = &children[0] {
                    assert_eq!(children[1], JSXNode::Expression("currentYear".to_string()));
                }
            }
        }
    }

    #[test]
    fn test_error_mismatched_tags() {
        let mut parser = Parser::new("<div>Hello</span>");
        assert!(parser.parse().is_err());
    }

    #[test]
    fn test_error_unclosed_tag() {
        let mut parser = Parser::new("<div>Hello");
        assert!(parser.parse().is_err());
    }

    #[test]
    fn test_error_unclosed_expression() {
        let mut parser = Parser::new("<div>{count</div>");
        assert!(parser.parse().is_err());
    }

    #[test]
    fn test_error_invalid_identifier() {
        let mut parser = Parser::new("<123>Hello</123>");
        assert!(parser.parse().is_err());
    }

    #[test]
    fn test_error_unclosed_attribute() {
        let mut parser = Parser::new(r#"<div class="test>Hello</div>"#);
        assert!(parser.parse().is_err());
    }

    // Helper to collect JSX slices from raw source using the streaming parser
    fn collect_jsx_slices(source: &str) -> Vec<String> {
        let mut out = Vec::new();
        let mut i = 0;
        while i < source.len() {
            if let Some(rel) = source[i..].find('<') {
                i += rel;
            } else {
                break;
            }
            let mut p = Parser::new(&source[i..]);
            match p.parse_next_with_span() {
                Some(Ok((_node, (start, end)))) => {
                    let start_abs = i + start;
                    let end_abs = i + end;
                    out.push(source[start_abs..end_abs].to_string());
                    i = end_abs;
                }
                Some(Err(_)) => {
                    // error recovery: advance one byte and try again
                    i += 1;
                }
                None => break,
            }
        }
        out
    }

    // ---- Ported extractor tests (collection semantics) ----

    #[test]
    fn collector_jsx_doctype_handling() {
        let input = r#"<!DOCTYPE html><html lang="en">Test</html>"#;
        let slices = collect_jsx_slices(input);
        assert_eq!(slices, vec!["<html lang=\"en\">Test</html>".to_string()]);
    }

    #[test]
    fn collector_simple_jsx() {
        let input = r#"
            function App() {
                return <div>Hello World</div>;
            }
        "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(slices, vec!["<div>Hello World</div>".to_string()]);
    }

    #[test]
    fn collector_apostrophe_handling() {
        let input = "<p>We don't share it with third parties</p>";
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec!["<p>We don't share it with third parties</p>".to_string()]
        );
    }

    #[test]
    fn collector_web_component() {
        let input = r#"
            function App() {
                return <web-component><span>Hello World</span></web-component>;
            }
        "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec!["<web-component><span>Hello World</span></web-component>".to_string()]
        );
    }

    #[test]
    fn collector_components_with_underscore_and_dollar() {
        let input = r#"
            const element = (
                <div>
                    <_CustomComponent>
                        <span>Inside underscore component</span>
                    </_CustomComponent>
                    <$DollarComponent prop={value}>
                        <p>Inside dollar component</p>
                    </$DollarComponent>
                    <_NestedComponent>
                        <$InnerComponent>
                            <div>Nested special components</div>
                        </$InnerComponent>
                    </_NestedComponent>
                </div>
            );
        "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(slices.len(), 1);
        let s = slices[0].trim();
        assert!(s.starts_with("<div>"));
        assert!(s.ends_with("</div>"));
        assert!(s.contains("<_CustomComponent>"));
        assert!(s.contains("<$DollarComponent"));
        assert!(s.contains("<_NestedComponent>"));
        assert!(s.contains("<$InnerComponent>"));
    }

    #[test]
    fn collector_jsx_with_props_block() {
        let input = r#"
                const element = <Button className="primary" onClick={() => {}}>
                    Click me
                </Button>;
            "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec![r#"<Button className="primary" onClick={() => {}}>
                    Click me
                </Button>"#
                .to_string()]
        );
    }

    #[test]
    fn collector_spread_and_template_literals_tight() {
        let input =
            r#"<button{...o}className={`w-full ${p[c]}${n?` ${n}`:""}`}type={r}>{e}</button>"#;
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec![
                r#"<button{...o}className={`w-full ${p[c]}${n?` ${n}`:""}`}type={r}>{e}</button>"#
                    .to_string()
            ]
        );
    }

    #[test]
    fn collector_self_closing_variants() {
        let s1 = r#"const img = <img src="test.jpg" alt="Test" />;"#;
        let out1 = collect_jsx_slices(s1);
        assert_eq!(
            out1,
            vec![r#"<img src="test.jpg" alt="Test" />"#.to_string()]
        );

        let s2 = r#"const el = <Component/>;"#;
        let out2 = collect_jsx_slices(s2);
        assert_eq!(out2, vec!["<Component/>".to_string()]);

        let s3 = r#"const el = <Component />;"#;
        let out3 = collect_jsx_slices(s3);
        assert_eq!(out3, vec!["<Component />".to_string()]);
    }

    #[test]
    fn collector_invalid_name_with_slash() {
        let s = r#"const el = <Comp/onent />;"#;
        let out = collect_jsx_slices(s);
        assert_eq!(out, Vec::<String>::new());
    }

    #[test]
    fn collector_fragments_and_outside_element() {
        let input = r#"
                <>
                    <div>First</div>
                    <>
                        <span>Nested</span>
                        <p>Fragment</p>
                    </>
                    <div>Last</div>
                </>
                <div>Outside fragment</div>
            "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec![
                r#"<>
                    <div>First</div>
                    <>
                        <span>Nested</span>
                        <p>Fragment</p>
                    </>
                    <div>Last</div>
                </>"#
                    .to_string(),
                r#"<div>Outside fragment</div>"#.to_string()
            ]
        );
    }

    #[test]
    fn collector_error_recovery() {
        let input = r#"
            <div>Valid</div>
            <Incomplete>
            <div>Still valid</div>
            < 123
            <div>Another valid</div>
        "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec![
                r#"<div>Valid</div>"#.to_string(),
                r#"<div>Still valid</div>"#.to_string(),
                r#"<div>Another valid</div>"#.to_string()
            ]
        );
    }

    #[test]
    fn collector_script_tag_with_code_and_html_string() {
        let input = r#"
                <script>
                    const copyClipboardButton = document.getElementById("js-copyClipboardButton");
                    const code = copyClipboardButton.querySelector("code");
                    const originalInnerHTML = copyClipboardButton.innerHTML;

                    let timeout;

                    copyClipboardButton.addEventListener("click", () => {
                        clearTimeout(timeout);
                        navigator.clipboard.writeText(code.textContent)
                            .then(() => {
                                copyClipboardButton.innerHTML = "<span class=\"text-sm font-mono mr-2\">Copied!</span>";
                                timeout = setTimeout(() => {
                                    copyClipboardButton.innerHTML = originalInnerHTML;
                                }, 1000);
                            })
                            .catch(err => {
                                console.error("Failed to copy: ", err);
                            });
                    });
                </script>
            "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(slices.len(), 1);
        let s = slices[0].trim();
        assert!(s.starts_with("<script>"));
        assert!(s.ends_with("</script>"));
        assert!(s.contains("document.getElementById(\"js-copyClipboardButton\")"));
        assert!(s.contains("copyClipboardButton.innerHTML"));
    }

    #[test]
    fn collector_extract_fragment() {
        let input = r#"
            let element = <>
                <div>First</div>
                <div>Second</div>
            </>;
            function Fragment() {
                return <>
                    <div>First</div>
                    <div>Second</div>
                </>;
            }
        "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec!["<>\n                <div>First</div>\n                <div>Second</div>\n            </>".to_string()
                ,
                "<>\n                    <div>First</div>\n                    <div>Second</div>\n                </>".to_string()
            ]
        );
    }

    #[test]
    fn collector_extract_complex_jsx() {
        let input = r#"
            function ComplexComponent() {
                return (
                    <div className={`container ${active ? 'active' : ''}`}>
                        <header>
                            {loading ? (
                                <Spinner />
                            ) : (
                                <h1>{title}</h1>
                            )}
                        </header>
                        <nav>
                            {items.map(item => (
                                <a key={item.id} href={`/item/${item.id}`}>
                                    {item.name}
                                </a>
                            ))}
                        </nav>
                    </div>
                );
            }
        "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec!["<div className={`container ${active ? 'active' : ''}`}>\n                        <header>\n                            {loading ? (\n                                <Spinner />\n                            ) : (\n                                <h1>{title}</h1>\n                            )}\n                        </header>\n                        <nav>\n                            {items.map(item => (\n                                <a key={item.id} href={`/item/${item.id}`}>\n                                    {item.name}\n                                </a>\n                            ))}\n                        </nav>\n                    </div>".to_string()
            ]
        );
    }

    #[test]
    fn collector_nested_expressions() {
        let input = r#"
            <div prop={{
                nested: {
                    object: true
                }
            }}>
                <span>{(() => {
                    const x = { y: 1 };
                    return x.y;
                })()}</span>
            </div>
        "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec![r#"<div prop={{
                nested: {
                    object: true
                }
            }}>
                <span>{(() => {
                    const x = { y: 1 };
                    return x.y;
                })()}</span>
            </div>"#
                .to_string()]
        );
    }

    #[test]
    fn collector_invalid_jsx() {
        let input = r#"
            const x = < 5;
            const y = <invalid;
            const valid = <div>This is valid</div>;
        "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(slices, vec!["<div>This is valid</div>".to_string()]);
    }

    #[test]
    fn collector_string_escaping() {
        let input = r#"
                const element = <div title="Quote \"inside\" string" data-value='Single\'s quote'>
                    <span alt={"Mixed \"quotes' and `ticks`"}>Text</span>
                </div>;
            "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec![
                r#"<div title="Quote \"inside\" string" data-value='Single\'s quote'>
                    <span alt={"Mixed \"quotes' and `ticks`"}>Text</span>
                </div>"#
                    .to_string()
            ]
        );
    }

    #[test]
    fn collector_nested_fragments_only() {
        let input = r#"
                <>
                    <>
                        <>
                            <f>F</f>
                        </>
                    </>
                </>
            "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec![
                "<>\n                    <>\n                        <>\n                            <f>F</f>\n                        </>\n                    </>\n                </>".to_string()
            ]
        );
    }

    #[test]
    fn collector_attribute_edge_cases() {
        let input = r#"
                <div>
                    <input disabled />
                    <button className={true ? 'active' : ''} />
                    <div data={`template${expr}`} />
                    <span {...spread} />
                    <custom-element some-attr="" />
                </div>
            "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec![r#"<div>
                    <input disabled />
                    <button className={true ? 'active' : ''} />
                    <div data={`template${expr}`} />
                    <span {...spread} />
                    <custom-element some-attr="" />
                </div>"#
                .to_string()]
        );
    }

    #[test]
    fn collector_comments_inside_jsx() {
        let input = r#"
                <div>
                    {/* JSX comment */}
                    <span>
                        // This is not a comment
                        /* Also not a comment */
                    </span>
                    {/*
                        Multiline
                        JSX comment
                    */}
                </div>
            "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec![r#"<div>
                    {/* JSX comment */}
                    <span>
                        // This is not a comment
                        /* Also not a comment */
                    </span>
                    {/*
                        Multiline
                        JSX comment
                    */}
                </div>"#
                .to_string()]
        );
    }

    #[test]
    fn collector_complex_expressions() {
        let input = r#"
                <div>
                    {(() => {
                        const obj = { key: "value" };
                        return <span>{`${obj.key}`}</span>;
                    })()}
                    {items?.map?.(item => (
                        <div key={item?.id ?? "default"}>
                            {item?.name || "Unnamed"}
                        </div>
                    ))}
                </div>
            "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec![r#"<div>
                    {(() => {
                        const obj = { key: "value" };
                        return <span>{`${obj.key}`}</span>;
                    })()}
                    {items?.map?.(item => (
                        <div key={item?.id ?? "default"}>
                            {item?.name || "Unnamed"}
                        </div>
                    ))}
                </div>"#
                .to_string()]
        );
    }

    #[test]
    fn collector_special_characters() {
        let input = r#"
                <div data-special="©®™">
                    <span>Em—dash</span>
                    <p>{"Unicode: \u{1F604}"}</p>
                </div>
            "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec![r#"<div data-special="©®™">
                    <span>Em—dash</span>
                    <p>{"Unicode: \u{1F604}"}</p>
                </div>"#
                .to_string()]
        );
    }

    #[test]
    fn collector_complex_layout() {
        let input = r#"const element = (<div className={`container ${theme}`}>
                <header className={styles.header}>
                    <h1>{title || "Default Title"}</h1>
                    <nav>
                        {menuItems.map((item, index) => (
                            <a
                                key={index}
                                href={item.href}
                                className={`${styles.link} ${currentPath === item.href ? styles.active : ''}`}
                            >
                                {item.icon && <Icon name={item.icon} />}
                                <span>{item.label}</span>
                                {item.badge && (
                                    <Badge count={item.badge} type={item.badgeType} />
                                )}
                            </a>
                        ))}
                    </nav>
                    {user ? (
                        <div className={styles.userMenu}>
                            <img src={user.avatar} alt="User avatar" />
                            <span>{user.name}</span>
                            <button onClick={handleLogout}>Logout</button>
                        </div>
                    ) : (
                        <button className={styles.loginButton} onClick={handleLogin}>
                            Login
                        </button>
                    )}
                </header>
                <main className={styles.main}>
                    {loading ? (
                        <div className={styles.loader}>
                            <Spinner size="large" color={theme === 'dark' ? 'white' : 'black'} />
                        </div>
                    ) : error ? (
                        <ErrorMessage message={error} onRetry={handleRetry} />
                    ) : (
                        <>{children}</>
                    )}
                </main>
                <footer className={styles.footer}>
                    <p>&copy; {currentYear} My Application</p>
                </footer>
            </div>)
        ;"#;
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec![r#"<div className={`container ${theme}`}>
                <header className={styles.header}>
                    <h1>{title || "Default Title"}</h1>
                    <nav>
                        {menuItems.map((item, index) => (
                            <a
                                key={index}
                                href={item.href}
                                className={`${styles.link} ${currentPath === item.href ? styles.active : ''}`}
                            >
                                {item.icon && <Icon name={item.icon} />}
                                <span>{item.label}</span>
                                {item.badge && (
                                    <Badge count={item.badge} type={item.badgeType} />
                                )}
                            </a>
                        ))}
                    </nav>
                    {user ? (
                        <div className={styles.userMenu}>
                            <img src={user.avatar} alt="User avatar" />
                            <span>{user.name}</span>
                            <button onClick={handleLogout}>Logout</button>
                        </div>
                    ) : (
                        <button className={styles.loginButton} onClick={handleLogin}>
                            Login
                        </button>
                    )}
                </header>
                <main className={styles.main}>
                    {loading ? (
                        <div className={styles.loader}>
                            <Spinner size="large" color={theme === 'dark' ? 'white' : 'black'} />
                        </div>
                    ) : error ? (
                        <ErrorMessage message={error} onRetry={handleRetry} />
                    ) : (
                        <>{children}</>
                    )}
                </main>
                <footer className={styles.footer}>
                    <p>&copy; {currentYear} My Application</p>
                </footer>
            </div>"#.to_string()]
        );
    }

    #[test]
    fn collector_invalid_jsx_with_broken_syntax() {
        let input = r#"
                const code = <n.length;r++)n[r]&&(n[r].__=e,t=Ne(n[r],t,o));return t></n>;
                const valid = <div>Valid element</div>;
            "#;
        let slices = collect_jsx_slices(input);
        assert_eq!(slices, vec!["<div>Valid element</div>".to_string()]);
    }

    #[test]
    fn collector_extract_fragment_solo() {
        let input = "<><div>First</div><div>Second</div></>";
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec!["<><div>First</div><div>Second</div></>".to_string()]
        );
    }

    #[test]
    fn collector_multiple_top_level_elements() {
        let input = "<div>One</div><span>Two</span>";
        let slices = collect_jsx_slices(input);
        assert_eq!(
            slices,
            vec!["<div>One</div>".to_string(), "<span>Two</span>".to_string()]
        );
    }
}
