use std::fmt;

#[derive(Debug)]
pub enum JSXErrorKind {
    InvalidAttribute(String),
    InvalidComponent(String),
    InvalidElement(String),
    UnsupportedSyntax(String),
    ExtractionError(String),
    ParsingError(String),
}

#[derive(Debug)]
pub enum JSXError {
    ExtractionError(String),
    ParsingError(String),
    TransformError(String),
}

impl JSXError {
    #[inline]
    pub fn with_kind(kind: JSXErrorKind) -> Self {
        match kind {
            JSXErrorKind::InvalidAttribute(msg) => {
                JSXError::TransformError(format!("Invalid attribute: {msg}"))
            }
            JSXErrorKind::InvalidComponent(msg) => {
                JSXError::TransformError(format!("Invalid component: {msg}"))
            }
            JSXErrorKind::InvalidElement(msg) => {
                JSXError::TransformError(format!("Invalid element: {msg}"))
            }
            JSXErrorKind::UnsupportedSyntax(msg) => {
                JSXError::TransformError(format!("Unsupported syntax: {msg}"))
            }
            JSXErrorKind::ExtractionError(msg) => JSXError::ExtractionError(msg),
            JSXErrorKind::ParsingError(msg) => JSXError::ParsingError(msg),
        }
    }
}

impl fmt::Display for JSXError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            JSXError::ExtractionError(msg) => write!(f, "JSX extraction error: {msg}"),
            JSXError::ParsingError(msg) => write!(f, "JSX parsing error: {msg}"),
            JSXError::TransformError(msg) => write!(f, "JSX transform error: {msg}"),
        }
    }
}
