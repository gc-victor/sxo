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

/// Structured streaming parser error with position for recovery/aggregation.
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
