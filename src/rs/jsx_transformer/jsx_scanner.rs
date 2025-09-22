//! JSX-aware scanner that skips JS comments, strings, regex, and template literals
//! to find the next plausible '<' character that could begin JSX.
//!
//! Design goals:
//! - Cohesive Mode enum to make scanning states explicit and mutually exclusive.
//! - Small, focused helpers for skipping constructs (comments, strings, regex).
//! - Maintain a conservative token context to disambiguate regex vs division.
//! - Preserve original public API and behavior: we DO NOT filter out '<' used as
//!   JS operators (e.g., `<`, `<=`, `<<`). We only ensure '<' is not inside
//!   non-code regions (comments, strings, template literal raw segments, regex).
//!
//! Public API:
//! - `find_next_jsx_start(src, from)` → Option<usize>

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TokenCtx {
    // A token that ends an operand/expression (ident/number/) ] } ) string regex template-end .
    AfterOperand,
    // A token that expects an operand to follow (operators, delimiters, keywords like return)
    BeforeOperand,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Mode {
    Normal,
    LineComment,
    BlockComment,
    String { quote: u8, escape: bool },
    Regex { in_class: bool, escape: bool },
    // We remain in Template mode while a template stack is non-empty; the top-of-stack
    // state (escape/in_expr/brace_depth) is stored separately in Scanner.
    Template,
}

#[derive(Clone, Copy, Debug)]
struct TemplateState {
    // When false: scanning raw string segment (not in `${...}`), `escape` applies there.
    // When true: scanning inside `${ ... }` expression; `brace_depth` counts nested `{}`.
    in_expr: bool,
    brace_depth: u32,
    escape: bool, // only meaningful when in_expr == false
}

/// Returns the index of the next '<' that is outside of JS comments, strings,
/// template literal raw segments, and regex literals, or `None` if none found
/// starting at `from`.
///
/// Single-pass O(n) from `from`.
pub fn find_next_jsx_start(src: &str, from: usize) -> Option<usize> {
    Scanner::new(src, from).find_next_jsx_start()
}

struct Scanner<'a> {
    bytes: &'a [u8],
    len: usize,
    i: usize,

    mode: Mode,
    ctx: TokenCtx,

    // Template literal nesting stack (supports nested templates inside expressions)
    tpl_stack: Vec<TemplateState>,
}

impl<'a> Scanner<'a> {
    fn new(src: &'a str, from: usize) -> Self {
        let bytes = src.as_bytes();
        let start = from.min(bytes.len());
        Self {
            bytes,
            len: bytes.len(),
            i: start,
            mode: Mode::Normal,
            ctx: TokenCtx::BeforeOperand, // at start of file, regex is allowed
            tpl_stack: Vec::new(),
        }
    }

    fn find_next_jsx_start(&mut self) -> Option<usize> {
        while self.i < self.len {
            match self.mode {
                Mode::Normal => {
                    if self.starts_with(b"//") {
                        self.i += 2;
                        self.mode = Mode::LineComment;
                        continue;
                    }
                    if self.starts_with(b"/*") {
                        self.i += 2;
                        self.mode = Mode::BlockComment;
                        continue;
                    }
                    if self.peek_byte() == Some(b'\'') {
                        self.i += 1;
                        self.mode = Mode::String {
                            quote: b'\'',
                            escape: false,
                        };
                        continue;
                    }
                    if self.peek_byte() == Some(b'"') {
                        self.i += 1;
                        self.mode = Mode::String {
                            quote: b'"',
                            escape: false,
                        };
                        continue;
                    }
                    if self.peek_byte() == Some(b'`') {
                        self.i += 1;
                        self.tpl_stack.push(TemplateState {
                            in_expr: false,
                            brace_depth: 0,
                            escape: false,
                        });
                        self.mode = Mode::Template;
                        // entering template is like starting a literal → typically BeforeOperand internally
                        self.ctx = TokenCtx::BeforeOperand;
                        continue;
                    }
                    if self.peek_byte() == Some(b'/') && self.can_start_regex() {
                        self.i += 1; // consume leading '/'
                        self.mode = Mode::Regex {
                            in_class: false,
                            escape: false,
                        };
                        continue;
                    }

                    // JSX detection: only treat '<' as JSX when next char plausibly starts a tag or fragment
                    if self.peek_byte() == Some(b'<') {
                        let next = if self.i + 1 < self.len {
                            Some(self.bytes[self.i + 1])
                        } else {
                            None
                        };
                        if let Some(n) = next {
                            if n.is_ascii_alphabetic()
                                || n == b'_'
                                || n == b'$'
                                || n == b'/'
                                || n == b'>'
                                || n == b'!'
                                || n == b'?'
                            {
                                return Some(self.i);
                            }
                        }
                        // Not plausible -> continue scanning as normal (e.g., relational/shift operator)
                    }

                    // Otherwise consume normally and update regex context heuristically
                    self.bump_normal_and_update_ctx();
                }

                Mode::LineComment => {
                    self.skip_line_comment();
                    self.mode = Mode::Normal;
                    // After line-comment, at line start: regex allowed
                    self.ctx = TokenCtx::BeforeOperand;
                }

                Mode::BlockComment => {
                    if !self.skip_block_comment() {
                        // Unclosed comment; end of input
                        return None;
                    }
                    self.mode = Mode::Normal;
                    // After block comment, treat like whitespace
                    self.ctx = TokenCtx::BeforeOperand;
                }

                Mode::String { quote, mut escape } => {
                    while let Some(c) = self.peek_byte() {
                        self.i += 1;
                        if escape {
                            escape = false;
                            continue;
                        }
                        if c == b'\\' {
                            escape = true;
                        } else if c == quote {
                            break;
                        }
                    }
                    self.mode = Mode::Normal;
                    self.ctx = TokenCtx::AfterOperand;
                }

                Mode::Regex {
                    mut in_class,
                    mut escape,
                } => {
                    while let Some(c) = self.peek_byte() {
                        self.i += 1;
                        if escape {
                            escape = false;
                            continue;
                        }
                        match c {
                            b'\\' => escape = true,
                            b'[' if !in_class => in_class = true,
                            b']' if in_class => in_class = false,
                            b'/' if !in_class => {
                                // Optional flags a-z
                                while let Some(f) = self.peek_byte() {
                                    if f.is_ascii_alphabetic() {
                                        self.i += 1;
                                    } else {
                                        break;
                                    }
                                }
                                break;
                            }
                            _ => {}
                        }
                    }
                    self.mode = Mode::Normal;
                    self.ctx = TokenCtx::AfterOperand;
                }

                Mode::Template => {
                    // We assume Template mode only when stack is non-empty.
                    if self.tpl_stack.is_empty() {
                        // Defensive: if stack is empty, reset to Normal
                        self.mode = Mode::Normal;
                        continue;
                    }
                    // Work with top-of-stack state
                    let top = self.tpl_stack.len() - 1;
                    let mut st = self.tpl_stack[top];

                    if !st.in_expr {
                        // In raw string segment of template
                        if let Some(c) = self.peek_byte() {
                            self.i += 1;
                            if st.escape {
                                // Previous char was backslash; current is escaped
                                st.escape = false;
                            } else {
                                match c {
                                    b'\\' => st.escape = true,
                                    b'`' => {
                                        // End of this template level
                                        self.tpl_stack.pop();
                                        if self.tpl_stack.is_empty() {
                                            // Exiting outermost template
                                            self.mode = Mode::Normal;
                                            self.ctx = TokenCtx::AfterOperand;
                                        }
                                        // No need to write back st if popped
                                        continue;
                                    }
                                    b'$' if self.peek_byte() == Some(b'{') => {
                                        // Enter ${ ... } expression
                                        self.i += 1; // consume '{'
                                        st.in_expr = true;
                                        st.brace_depth = 0;
                                        self.ctx = TokenCtx::BeforeOperand;
                                    }
                                    _ => {}
                                }
                            }
                            // Write back updated state
                            if let Some(t) = self.tpl_stack.last_mut() {
                                *t = st;
                            }
                            continue;
                        } else {
                            // EOF in template
                            return None;
                        }
                    } else {
                        // Inside ${ ... } expression
                        if self.starts_with(b"//") {
                            self.i += 2;
                            self.skip_line_comment();
                            // Remain in expression; context generally BeforeOperand at line start
                            self.ctx = TokenCtx::BeforeOperand;
                            continue;
                        }
                        if self.starts_with(b"/*") {
                            self.i += 2;
                            if !self.skip_block_comment() {
                                return None;
                            }
                            self.ctx = TokenCtx::BeforeOperand;
                            continue;
                        }

                        if let Some(c) = self.peek_byte() {
                            // Handle nested string literals inside expression
                            if c == b'\'' || c == b'"' {
                                self.i += 1;
                                self.skip_string(c);
                                self.ctx = TokenCtx::AfterOperand;
                                continue;
                            }

                            // Nested template literal inside expression
                            if c == b'`' {
                                self.i += 1;
                                self.tpl_stack.push(TemplateState {
                                    in_expr: false,
                                    brace_depth: 0,
                                    escape: false,
                                });
                                // Still in Template mode
                                self.ctx = TokenCtx::BeforeOperand;
                                continue;
                            }

                            // Regex literal inside expression (not starting a comment)
                            if c == b'/' && self.can_start_regex() {
                                self.i += 1;
                                self.consume_regex_in_place();
                                self.ctx = TokenCtx::AfterOperand;
                                continue;
                            }

                            // Brace accounting for ${ ... }
                            if c == b'{' {
                                self.i += 1;
                                st.brace_depth = st.brace_depth.saturating_add(1);
                                self.ctx = TokenCtx::BeforeOperand;
                                if let Some(t) = self.tpl_stack.last_mut() {
                                    *t = st;
                                }
                                continue;
                            }
                            if c == b'}' {
                                self.i += 1;
                                if st.brace_depth == 0 {
                                    // End of ${ ... } expression; back to raw string segment
                                    st.in_expr = false;
                                    self.ctx = TokenCtx::AfterOperand;
                                } else {
                                    st.brace_depth -= 1;
                                }
                                if let Some(t) = self.tpl_stack.last_mut() {
                                    *t = st;
                                }
                                continue;
                            }

                            // Otherwise consume normally within expression
                            self.bump_normal_and_update_ctx();
                            continue;
                        } else {
                            // EOF inside expression
                            return None;
                        }
                    }
                }
            }
        }
        None
    }

    // -------- Context and skipping helpers --------

    fn skip_line_comment(&mut self) {
        while let Some(c) = self.peek_byte() {
            self.i += 1;
            if c == b'\n' {
                break;
            }
            if c == b'\r' {
                // Support CRLF
                if self.peek_byte() == Some(b'\n') {
                    self.i += 1;
                }
                break;
            }
        }
    }

    fn skip_block_comment(&mut self) -> bool {
        while self.i < self.len {
            if self.starts_with(b"*/") {
                self.i += 2;
                return true;
            }
            self.i += 1;
        }
        false
    }

    fn skip_string(&mut self, quote: u8) {
        let mut escape = false;
        while let Some(c) = self.peek_byte() {
            self.i += 1;
            if escape {
                escape = false;
                continue;
            }
            if c == b'\\' {
                escape = true;
            } else if c == quote {
                break;
            }
        }
    }

    fn consume_regex_in_place(&mut self) {
        let mut in_class = false;
        let mut escape = false;
        while let Some(c) = self.peek_byte() {
            self.i += 1;
            if escape {
                escape = false;
                continue;
            }
            match c {
                b'\\' => escape = true,
                b'[' if !in_class => in_class = true,
                b']' if in_class => in_class = false,
                b'/' if !in_class => {
                    // optional flags
                    while let Some(f) = self.peek_byte() {
                        if f.is_ascii_alphabetic() {
                            self.i += 1;
                        } else {
                            break;
                        }
                    }
                    break;
                }
                _ => {}
            }
        }
    }

    fn bump_normal_and_update_ctx(&mut self) {
        if let Some(b) = self.peek_byte() {
            // Whitespace: consume all, no context change
            if is_whitespace(b) {
                self.i = self.advance_while(is_whitespace);
                return;
            }

            // Identifiers and keywords
            if is_ident_start(b) {
                let start = self.i;
                self.i += 1;
                while let Some(n) = self.peek_byte() {
                    if is_ident_part(n) {
                        self.i += 1;
                    } else {
                        break;
                    }
                }
                self.ctx = classify_ident_ctx(&self.bytes[start..self.i]);
                return;
            }

            // Numeric literal (simplified)
            if b.is_ascii_digit() {
                self.i += 1;
                while let Some(n) = self.peek_byte() {
                    if n.is_ascii_digit() {
                        self.i += 1;
                    } else {
                        break;
                    }
                }
                if self.peek_byte() == Some(b'.') {
                    self.i += 1;
                    while let Some(n) = self.peek_byte() {
                        if n.is_ascii_digit() {
                            self.i += 1;
                        } else {
                            break;
                        }
                    }
                }
                self.ctx = TokenCtx::AfterOperand;
                return;
            }

            // Punctuation and operators
            self.i += 1;
            self.ctx = match b {
                b')' | b']' | b'}' | b'.' => TokenCtx::AfterOperand,
                _ => TokenCtx::BeforeOperand,
            };
        }
    }

    #[inline]
    fn can_start_regex(&self) -> bool {
        matches!(self.ctx, TokenCtx::BeforeOperand)
    }

    // -------- Byte utilities --------

    #[inline]
    fn peek_byte(&self) -> Option<u8> {
        if self.i < self.len {
            Some(self.bytes[self.i])
        } else {
            None
        }
    }

    #[inline]
    fn starts_with(&self, pat: &[u8]) -> bool {
        let end = self.i.saturating_add(pat.len());
        end <= self.len && &self.bytes[self.i..end] == pat
    }

    #[inline]
    fn advance_while<F: Fn(u8) -> bool>(&self, pred: F) -> usize {
        let mut j = self.i;
        while j < self.len && pred(self.bytes[j]) {
            j += 1;
        }
        j
    }
}

// -------- Char classes and identifier classification --------

#[inline]
fn is_whitespace(b: u8) -> bool {
    matches!(b, b' ' | b'\t' | b'\n' | b'\r' | 0x0B | 0x0C)
}

// Minimal ASCII identifier classes; broaden if you need full unicode identifiers.
#[inline]
fn is_ident_start(b: u8) -> bool {
    b.is_ascii_alphabetic() || b == b'_' || b == b'$'
}

#[inline]
fn is_ident_part(b: u8) -> bool {
    is_ident_start(b) || b.is_ascii_digit()
}

#[inline]
fn eq_ignore_ascii_case(a: u8, b: u8) -> bool {
    a == b || a.to_ascii_lowercase() == b
}

#[inline]
fn slice_eq_ignore_ascii_case(s: &[u8], t: &[u8]) -> bool {
    if s.len() != t.len() {
        return false;
    }
    for (i, &tb) in t.iter().enumerate() {
        if !eq_ignore_ascii_case(s[i], tb) {
            return false;
        }
    }
    true
}

fn classify_ident_ctx(word_bytes: &[u8]) -> TokenCtx {
    // Keywords which leave us "BeforeOperand" (i.e., a regex can start next):
    // return, throw, case, else, yield, await, typeof, void, delete, new, in, instanceof, of
    // Also include: do, default, as (TS), import, export
    const BEFORE_OPERAND_KEYWORDS: &[&[u8]] = &[
        b"return",
        b"throw",
        b"case",
        b"else",
        b"yield",
        b"await",
        b"typeof",
        b"void",
        b"delete",
        b"new",
        b"in",
        b"instanceof",
        b"of",
        b"do",
        b"default",
        b"as",
        b"import",
        b"export",
    ];

    for kw in BEFORE_OPERAND_KEYWORDS {
        if slice_eq_ignore_ascii_case(word_bytes, kw) {
            return TokenCtx::BeforeOperand;
        }
    }

    // Other identifiers (including keywords not listed above) end an operand.
    TokenCtx::AfterOperand
}
