mod errors;
pub mod tags_attrs;
mod transform;

pub use errors::{JSXError, JSXErrorKind};

use crate::jsx_parser::Parser;
use regex::Regex;
use std::sync::LazyLock;
use transform::transform_to_template;

// Common constants used across the transformer.
const EMPTY_STRING: &str = "";

/// Transforms JSX found in the provided source string into
/// a template-literal-based output using the runtime helpers.
/// - Streams through the input to find `<` and invokes the parser from that point
/// - Aggregates parser diagnostics (pretty-formatted) instead of failing fast
/// - Performs a final cleanup to remove empty interpolations produced by edge cases
pub fn jsx_transformer(source: &str) -> Result<String, JSXError> {
    let input = remove_jsx_comments(source);
    let mut out = String::with_capacity(input.len() + 32);
    let mut cursor = 0;
    let mut i: usize = 0;
    let mut errors: Vec<String> = Vec::new();

    // Streaming scan + error accumulation: on parse error advance one byte and continue
    while i < input.len() {
        if let Some(rel) = input[i..].find('<') {
            i += rel;
        } else {
            break;
        }

        let mut p = Parser::new(&input[i..]);
        match p.parse_next_with_span() {
            Some(Ok((ast, (start, end)))) => {
                let start_abs = i + start;
                let end_abs = i + end;
                if start_abs > cursor {
                    out.push_str(&input[cursor..start_abs]);
                }
                let template = transform_to_template(&ast)?;
                let transformed = format!("`{template}`");
                out.push_str(&transformed);
                cursor = end_abs;
                i = end_abs;
            }
            Some(Err(e)) => {
                let pos_abs = i + e.position;
                errors.push(format_diagnostic(&input, pos_abs, &e.message));
                i += 1; // recovery: advance and continue scanning
            }
            None => break,
        }
    }

    if cursor < input.len() {
        out.push_str(&input[cursor..]);
    }

    if !errors.is_empty() {
        return Err(JSXError::with_kind(JSXErrorKind::ParsingError(
            errors.join("\n"),
        )));
    }

    // Remove empty interpolation artifacts
    Ok(out.replace("${}", EMPTY_STRING))
}

// Compile regex patterns once at runtime
// Matches JSX comments of the form {/* ... */}
static JSX_COMMENT_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)\{/\*.*?\*/\}").expect("Invalid JSX comment regex"));

// Matches block comments like /* ... */ (including /** ... */)
static BLOCK_COMMENT_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)/\*.*?\*/").expect("Invalid block comment regex"));

#[inline]
fn remove_jsx_comments(source: &str) -> String {
    // Remove JSX-style comments: {/* ... */}
    let after_jsx = JSX_COMMENT_RE.replace_all(source, "");

    // Remove block comments: /* ... */ and /** ... */
    BLOCK_COMMENT_RE.replace_all(&after_jsx, "").into_owned()
}

// Pretty diagnostic formatter for parser errors with line/column and caret.
// Tabs are expanded to 4 spaces for caret alignment. Column is 1-based.
pub(crate) fn format_diagnostic(source: &str, pos: usize, message: &str) -> String {
    let len = source.len();
    let pos = if pos > len { len } else { pos };

    // Determine the line start and end around the error position
    let before = &source[..pos];
    let line_start = before.rfind('\n').map(|i| i + 1).unwrap_or(0);

    let after = &source[pos..];
    let line_end_rel = after.find('\n').unwrap_or(after.len());
    let line_end = pos + line_end_rel;

    let line_str = &source[line_start..line_end];

    // Expand tabs for consistent caret alignment
    let expand = |s: &str| s.replace('\t', "    ");
    let prefix = &source[line_start..pos];
    let prefix_expanded = expand(prefix);
    let line_expanded = expand(line_str);

    // Calculate 1-based line and column
    let line_no = before.chars().filter(|&c| c == '\n').count() + 1;
    let col_no = prefix_expanded.chars().count() + 1;

    // Build output in a Rust-like diagnostic style with dynamic gutter width
    let mut out = String::new();
    out.push_str(&format!("  --> input:{}:{}\n", line_no, col_no));
    let width = line_no.to_string().chars().count();
    let gutter_spaces = " ".repeat(width);

    // Leading gutter
    out.push_str(&format!("{} |\n", gutter_spaces));

    // Numbered source line
    out.push_str(&format!("{:>width$} | ", line_no, width = width));
    out.push_str(&line_expanded);
    out.push('\n');

    // Caret line
    out.push_str(&format!("{} | ", gutter_spaces));
    if pos != 0 {
        let caret_pad = " ".repeat(prefix_expanded.chars().count());
        out.push_str(&caret_pad);
        out.push('^');
    } else {
        // Mark the whole line when at position 0
        let carets = "^".repeat(line_expanded.chars().count());
        out.push_str(&carets);
    }
    out.push('\n');

    // Trailing gutter and note
    out.push_str(&format!("{} |\n", gutter_spaces));
    out.push_str(&format!("{} = note: {}\n", gutter_spaces, message));
    out
}
