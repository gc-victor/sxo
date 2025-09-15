use crate::jsx_parser::{walk_node, JSXAttribute, JSXAttributeValue, JSXNode, JSXVisitor, Parser};

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

impl std::fmt::Display for JSXError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            JSXError::ExtractionError(msg) => write!(f, "JSX extraction error: {msg}"),
            JSXError::ParsingError(msg) => write!(f, "JSX parsing error: {msg}"),
            JSXError::TransformError(msg) => write!(f, "JSX transform error: {msg}"),
        }
    }
}

const OPENING_BRACKET: &str = "<";
const COMMA: &str = ",";
const UNDERSCORE: char = '_';
const DOLLAR_SIGN: char = '$';
const EMPTY_STRING: &str = "";

const VOID_TAGS: [&str; 23] = [
    "area", "base", "br", "circle", "col", "ellipse", "embed", "hr", "image", "img", "input",
    "line", "link", "meta", "param", "path", "polygon", "polyline", "rect", "source", "track",
    "use", "wbr",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TagType {
    Component,
    WebComponent,
    Void,
    Element,
}

#[inline(always)]
fn classify_tag(tag: &str) -> TagType {
    // Component: starts with uppercase, '_' or '$'
    if tag
        .chars()
        .next()
        .map(|c| c.is_uppercase() || c == UNDERSCORE || c == DOLLAR_SIGN)
        .unwrap_or(false)
    {
        return TagType::Component;
    }

    // Web Component: contains a hyphen per Custom Elements spec
    if tag.contains('-') {
        return TagType::WebComponent;
    }

    // Void element: binary search against sorted list (case-insensitive)
    let lower = tag.to_ascii_lowercase();
    if VOID_TAGS.binary_search(&lower.as_str()).is_ok() {
        return TagType::Void;
    }

    TagType::Element
}

// removed: replaced by classify_tag()

// removed: replaced by classify_tag() with efficient void lookup

pub fn jsx_precompile(source: &str) -> Result<String, JSXError> {
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

#[inline]
fn remove_jsx_comments(source: &str) -> String {
    let re = regex::Regex::new(r"(?s)\{/\*.*?\*/\}").unwrap();
    re.replace_all(source, "").into_owned()
}

/// Pretty diagnostic formatter for parser errors with line/column and caret.
/// Tabs are expanded to 4 spaces for caret alignment. Column is 1-based.
fn format_diagnostic(source: &str, pos: usize, message: &str) -> String {
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

#[inline]
fn needs_list_wrapper(s: &str) -> bool {
    // Minimal scanner that ignores strings/templates and detects array-producing/copying calls.
    let mut in_squote = false;
    let mut in_dquote = false;
    let mut in_tmpl = false;
    let mut escape = false;

    let mut iter = s.chars().peekable();

    while let Some(ch) = iter.next() {
        if escape {
            escape = false;
            continue;
        }
        match ch {
            '\\' => {
                escape = true;
                continue;
            }
            '\'' if !in_dquote && !in_tmpl => {
                in_squote = !in_squote;
                continue;
            }
            '"' if !in_squote && !in_tmpl => {
                in_dquote = !in_dquote;
                continue;
            }
            '`' if !in_squote && !in_dquote => {
                in_tmpl = !in_tmpl;
                continue;
            }
            _ => {}
        }

        if in_squote || in_dquote || in_tmpl {
            continue;
        }

        // Detect ".name" or "?.name"
        let mut at_property = false;
        if ch == '.' {
            at_property = true;
        } else if ch == '?' {
            if let Some('.') = iter.peek().copied() {
                iter.next();
                at_property = true;
            }
        }

        if at_property {
            // Read identifier: first char [A-Za-z_$], subsequent [A-Za-z0-9_$]
            let mut name = String::new();
            if let Some(&c0) = iter.peek() {
                if c0.is_ascii_alphabetic() || c0 == '_' || c0 == '$' {
                    name.push(c0);
                    iter.next();
                    while let Some(&cn) = iter.peek() {
                        if cn.is_ascii_alphanumeric() || cn == '_' || cn == '$' {
                            name.push(cn);
                            iter.next();
                        } else {
                            break;
                        }
                    }
                }
            }

            // Skip whitespace before call indicator
            let mut la = iter.clone();
            while let Some(&c) = la.peek() {
                if c.is_whitespace() {
                    la.next();
                } else {
                    break;
                }
            }

            // Allow "(" or "?.("
            let is_call = match la.peek().copied() {
                Some('(') => true,
                Some('?') => {
                    la.next();
                    if let Some('.') = la.peek().copied() {
                        la.next();
                        matches!(la.peek().copied(), Some('('))
                    } else {
                        false
                    }
                }
                _ => false,
            };

            if is_call
                && matches!(
                    name.as_str(),
                    // Core sequence builders
                    "map" | "flatMap" | "filter" |
                    // Array-producing transforms
                    "slice" | "concat" | "flat" |
                    // Modern immutable array-producing
                    "toReversed" | "toSorted" | "toSpliced" | "with" |
                    // Mutating but array-returning
                    "reverse" | "sort" | "splice" | "fill" | "copyWithin" |
                    // Scalar reducers (kept for compatibility)
                    "reduce" | "reduceRight" |
                    // Compatibility: returns undefined but kept for parity
                    "forEach"
                )
            {
                return true;
            }
        }
    }
    false
}

fn transform_to_template(ast: &JSXNode) -> Result<String, JSXError> {
    // Visitor-based transformation: traverse AST and build the template via a stack of frames.
    let mut transformer = TemplateTransformer::new_root();
    walk_node(&mut transformer, ast);
    transformer.finalize()
}

// Unified attribute transformation helper
#[inline]
fn transform_attribute(attr: &JSXAttribute, target: TagType) -> String {
    match target {
        TagType::Component => match &attr.value {
            Some(JSXAttributeValue::Expression(expr)) => {
                format!(r#"{{"{}":{}}}"#, &attr.name, expr)
            }
            Some(JSXAttributeValue::DoubleQuote(value)) => {
                format!(r#"{{"{}":"{}"}}"#, &attr.name, value)
            }
            Some(JSXAttributeValue::SingleQuote(value)) => {
                format!(r#"{{"{}":'{}'}}"#, &attr.name, value)
            }
            None => {
                if attr.name.starts_with("...") {
                    format!("{{{}}}", attr.name)
                } else {
                    format!(r#"{{"{}":true}}"#, attr.name)
                }
            }
        },
        // Elements (including web components and voids) share the same serialization
        _ => {
            // Handle boolean and spread first (no normalized name for boolean to preserve legacy behavior)
            if attr.value.is_none() {
                if attr.name.starts_with("...") {
                    return format!("${{__jsxSpread({})}}", attr.name.replace("...", ""));
                } else {
                    return attr.name.to_string();
                }
            }

            let name = normalize_html_attr_name(&attr.name);
            match &attr.value {
                Some(JSXAttributeValue::Expression(expr)) => {
                    format!(r#"{name}="${{{expr}}}""#)
                }
                Some(JSXAttributeValue::DoubleQuote(value)) => {
                    format!(r#"{name}="{value}""#)
                }
                Some(JSXAttributeValue::SingleQuote(value)) => {
                    format!("{name}='{value}'")
                }
                None => unreachable!("handled above"),
            }
        }
    }
}

fn transform_component_attributes(attributes: &[JSXAttribute]) -> Result<String, JSXError> {
    let mut attr_parts = Vec::new();
    for attr in attributes.iter() {
        attr_parts.push(transform_attribute(attr, TagType::Component));
    }
    Ok(format!("[{}]", attr_parts.join(COMMA)))
}

fn transform_element_attributes(attributes: &[JSXAttribute]) -> Result<Vec<String>, JSXError> {
    let mut attr_parts = Vec::new();
    for attr in attributes {
        attr_parts.push(transform_attribute(attr, TagType::Element));
    }
    Ok(attr_parts)
}

// Visitor-based transformer implementation
enum NodeFrame {
    Element {
        tag: String,
        attrs_str: String,
        is_void: bool,
        builder: TemplateBuilder,
    },
    Component {
        tag: String,
        attr_parts: String,
        builder: TemplateBuilder,
    },
    Fragment {
        builder: TemplateBuilder,
    },
}

struct TemplateTransformer {
    stack: Vec<NodeFrame>,
    error: Option<JSXError>,
}

impl TemplateTransformer {
    fn new_root() -> Self {
        // Root fragment frame to accumulate output even when the root is Text/Expression
        Self {
            stack: vec![NodeFrame::Fragment {
                builder: TemplateBuilder::new(),
            }],
            error: None,
        }
    }

    #[inline]
    fn current_builder_mut(&mut self) -> Option<&mut TemplateBuilder> {
        self.stack.last_mut().map(|frame| match frame {
            NodeFrame::Element { builder, .. } => builder,
            NodeFrame::Component { builder, .. } => builder,
            NodeFrame::Fragment { builder } => builder,
        })
    }

    #[inline]
    fn append_to_parent(&mut self, s: &str) {
        if let Some(parent) = self.stack.last_mut() {
            match parent {
                NodeFrame::Element { builder, .. } => builder.append_child_tpl(s),
                NodeFrame::Component { builder, .. } => builder.append_child_tpl(s),
                NodeFrame::Fragment { builder } => builder.append_child_tpl(s),
            }
        }
    }

    fn finalize(mut self) -> Result<String, JSXError> {
        if let Some(err) = self.error {
            return Err(err);
        }
        // At this point only the root fragment frame should remain
        match self.stack.pop() {
            Some(NodeFrame::Fragment { builder }) => Ok(builder.finalize()),
            Some(NodeFrame::Element {
                tag,
                attrs_str,
                is_void,
                builder,
            }) => {
                if is_void {
                    Ok(format!("<{tag}{attrs_str}/>"))
                } else {
                    Ok(format!("<{tag}{attrs_str}>{}</{tag}>", builder.finalize()))
                }
            }
            Some(NodeFrame::Component {
                tag,
                attr_parts,
                builder,
            }) => {
                let children_str = builder.finalize();
                if children_str.is_empty() {
                    Ok(format!(r#"${{__jsxComponent({tag}, {attr_parts})}}"#))
                } else {
                    Ok(format!(
                        r#"${{__jsxComponent({}, {}, `{}`)}}"#,
                        tag,
                        attr_parts,
                        children_str.trim()
                    ))
                }
            }
            None => Ok(String::new()),
        }
    }
}

impl JSXVisitor for TemplateTransformer {
    fn enter_element(&mut self, tag: &str, attributes: &[JSXAttribute]) {
        if self.error.is_some() {
            return;
        }

        match classify_tag(tag) {
            TagType::Component => match transform_component_attributes(attributes) {
                Ok(attr_parts) => {
                    self.stack.push(NodeFrame::Component {
                        tag: tag.to_string(),
                        attr_parts,
                        builder: TemplateBuilder::new(),
                    });
                }
                Err(e) => {
                    self.error = Some(e);
                }
            },
            _ => {
                // Normal element or web component
                match transform_element_attributes(attributes) {
                    Ok(attrs) => {
                        let attrs_str = if !attrs.is_empty() {
                            attrs
                                .iter()
                                .map(|attr| {
                                    if attr.starts_with("${__jsxSpread") {
                                        attr.to_string()
                                    } else {
                                        format!(" {attr}")
                                    }
                                })
                                .collect::<String>()
                        } else {
                            String::new()
                        };

                        let is_void = matches!(classify_tag(tag), TagType::Void);
                        self.stack.push(NodeFrame::Element {
                            tag: tag.to_string(),
                            attrs_str,
                            is_void,
                            builder: TemplateBuilder::new(),
                        });
                    }
                    Err(e) => {
                        self.error = Some(e);
                    }
                }
            }
        }
    }

    fn exit_element(&mut self, tag: &str) {
        if self.error.is_some() {
            return;
        }

        // Pop current frame and append its rendered output to the parent
        let frame = self.stack.pop();
        if let Some(frame) = frame {
            match frame {
                NodeFrame::Element {
                    tag: frame_tag,
                    attrs_str,
                    is_void,
                    builder,
                } => {
                    debug_assert_eq!(frame_tag, tag);
                    let rendered = if is_void {
                        format!("<{tag}{attrs_str}/>")
                    } else {
                        format!("<{tag}{attrs_str}>{}</{tag}>", builder.finalize())
                    };
                    self.append_to_parent(&rendered);
                }
                NodeFrame::Component {
                    tag: frame_tag,
                    attr_parts,
                    builder,
                } => {
                    debug_assert_eq!(frame_tag, tag);
                    let children_str = builder.finalize();
                    let rendered = if children_str.is_empty() {
                        format!(r#"${{__jsxComponent({tag}, {attr_parts})}}"#)
                    } else {
                        format!(
                            r#"${{__jsxComponent({}, {}, `{}`)}}"#,
                            tag,
                            attr_parts,
                            children_str.trim()
                        )
                    };
                    self.append_to_parent(&rendered);
                }
                NodeFrame::Fragment { .. } => {
                    // Not possible in exit_element
                }
            }
        }
    }

    fn enter_fragment(&mut self) {
        if self.error.is_some() {
            return;
        }
        self.stack.push(NodeFrame::Fragment {
            builder: TemplateBuilder::new(),
        });
    }

    fn exit_fragment(&mut self) {
        if self.error.is_some() {
            return;
        }
        if let Some(NodeFrame::Fragment { builder }) = self.stack.pop() {
            let rendered = builder.finalize();
            self.append_to_parent(&rendered);
        }
    }

    fn visit_text(&mut self, text: &str) {
        if self.error.is_some() {
            return;
        }
        if let Some(b) = self.current_builder_mut() {
            b.push_text(text);
        }
    }

    fn visit_expression(&mut self, expr: &str) {
        if self.error.is_some() {
            return;
        }
        if let Some(b) = self.current_builder_mut() {
            if expr.contains(OPENING_BRACKET) {
                match jsx_precompile(expr) {
                    Ok(nested) => {
                        let nested_trim = nested.trim();
                        if needs_list_wrapper(expr) {
                            b.append_child_tpl(&format!("${{__jsxList({})}}", nested_trim));
                        } else {
                            b.append_child_tpl(&format!("${{{}}}", nested_trim));
                        }
                    }
                    Err(e) => {
                        self.error = Some(e);
                    }
                }
            } else {
                b.push_expr(expr);
            }
        }
    }
}

// AIDEV-NOTE: TemplateBuilder centralizes child assembly and flattens trivial nested templates.
struct TemplateBuilder {
    out: String,
    // Reserved for future: track if any array-ish expressions were encountered.
    #[allow(dead_code)]
    has_array: bool,
}

impl TemplateBuilder {
    fn new() -> Self {
        Self {
            out: String::new(),
            has_array: false,
        }
    }

    #[inline]
    fn push_text(&mut self, s: &str) {
        self.out.push_str(s);
    }

    #[inline]
    fn push_expr(&mut self, expr: &str) {
        // Flatten the trivial case where the expression is a backtick string with a single interpolation: `${inner}`
        if let Some(inner) = extract_single_expr_from_backtick(expr) {
            self.out.push_str("${");
            self.out.push_str(inner);
            self.out.push('}');
        } else if needs_list_wrapper(expr) {
            self.out.push_str("${__jsxList(");
            self.out.push_str(expr);
            self.out.push_str(")}");
        } else {
            self.out.push_str("${");
            self.out.push_str(expr);
            self.out.push('}');
        }
    }

    #[inline]
    fn append_child_tpl(&mut self, tpl_like: &str) {
        if let Some(flat) = flatten_trivial_nested_child(tpl_like) {
            self.out.push_str(&flat);
        } else {
            self.out.push_str(tpl_like);
        }
    }

    #[inline]
    fn finalize(self) -> String {
        self.out.trim().to_string()
    }
}

// Returns Some(inner) when input is a backtick template containing only a single interpolation: `${inner}`
fn extract_single_expr_from_backtick(expr: &str) -> Option<&str> {
    let s = expr.trim();
    if s.starts_with('`') && s.ends_with('`') {
        let inner = &s[1..s.len() - 1];
        let trimmed = inner.trim();
        if trimmed.starts_with("${")
            && trimmed.ends_with('}')
            && trimmed.match_indices("${").count() == 1
        {
            return Some(&trimmed[2..trimmed.len() - 1]);
        }
    }
    None
}

// Flattens `${`...`}` when the backtick content itself is exactly a single `${expr}`
fn flatten_trivial_nested_child(s: &str) -> Option<String> {
    let t = s.trim();
    if t.starts_with("${`") && t.ends_with("`}") {
        let inner = &t[3..t.len() - 2];
        let inner_trim = inner.trim();
        if inner_trim.starts_with("${")
            && inner_trim.ends_with('}')
            && inner_trim.match_indices("${").count() == 1
        {
            return Some(format!("${}", &inner_trim[2..]));
        }
    }
    None
}

// @see: https://github.com/denoland/deno_ast/blob/3aba071b59d71802398c2fbcd2d01c99a51553cf/src/transpiling/jsx_precompile.rs#L89
#[inline]
fn normalize_html_attr_name(name: &str) -> String {
    match name {
        // JSX specific
        "htmlFor" => "for".to_string(),
        "className" => "class".to_string(),
        "dangerouslySetInnerHTML" => name.to_string(),

        "panose1" => "panose-1".to_string(),
        "xlinkActuate" => "xlink:actuate".to_string(),
        "xlinkArcrole" => "xlink:arcrole".to_string(),

        // xlink:href was removed from SVG and isn't needed
        "xlinkHref" => "href".to_string(),
        "xlink:href" => "href".to_string(),

        "xlinkRole" => "xlink:role".to_string(),
        "xlinkShow" => "xlink:show".to_string(),
        "xlinkTitle" => "xlink:title".to_string(),
        "xlinkType" => "xlink:type".to_string(),
        "xmlBase" => "xml:base".to_string(),
        "xmlLang" => "xml:lang".to_string(),
        "xmlSpace" => "xml:space".to_string(),

        // Attributes that are kebab-cased
        "accentHeight"
        | "acceptCharset"
        | "alignmentBaseline"
        | "arabicForm"
        | "baselineShift"
        | "capHeight"
        | "clipPath"
        | "clipRule"
        | "colorInterpolation"
        | "colorInterpolationFilters"
        | "colorProfile"
        | "colorRendering"
        | "contentScriptType"
        | "contentStyleType"
        | "dominantBaseline"
        | "enableBackground"
        | "fillOpacity"
        | "fillRule"
        | "floodColor"
        | "floodOpacity"
        | "fontFamily"
        | "fontSize"
        | "fontSizeAdjust"
        | "fontStretch"
        | "fontStyle"
        | "fontVariant"
        | "fontWeight"
        | "glyphName"
        | "glyphOrientationHorizontal"
        | "glyphOrientationVertical"
        | "horizAdvX"
        | "horizOriginX"
        | "horizOriginY"
        | "httpEquiv"
        | "imageRendering"
        | "letterSpacing"
        | "lightingColor"
        | "markerEnd"
        | "markerMid"
        | "markerStart"
        | "overlinePosition"
        | "overlineThickness"
        | "paintOrder"
        | "pointerEvents"
        | "renderingIntent"
        | "shapeRendering"
        | "stopColor"
        | "stopOpacity"
        | "strikethroughPosition"
        | "strikethroughThickness"
        | "strokeDasharray"
        | "strokeDashoffset"
        | "strokeLinecap"
        | "strokeLinejoin"
        | "strokeMiterlimit"
        | "strokeOpacity"
        | "strokeWidth"
        | "textAnchor"
        | "textDecoration"
        | "textRendering"
        | "transformOrigin"
        | "underlinePosition"
        | "underlineThickness"
        | "unicodeBidi"
        | "unicodeRange"
        | "unitsPerEm"
        | "vAlphabetic"
        | "vectorEffect"
        | "vertAdvY"
        | "vertOriginX"
        | "vertOriginY"
        | "vHanging"
        | "vMathematical"
        | "wordSpacing"
        | "writingMode"
        | "xHeight" => name
            .chars()
            .map(|ch| match ch {
                'A'..='Z' => format!("-{}", ch.to_lowercase()),
                _ => ch.to_string(),
            })
            .collect(),

        // Attributes that are camelCased and should be kept as is.
        "allowReorder"
        | "attributeName"
        | "attributeType"
        | "baseFrequency"
        | "baseProfile"
        | "calcMode"
        | "clipPathUnits"
        | "diffuseConstant"
        | "edgeMode"
        | "filterUnits"
        | "glyphRef"
        | "gradientTransform"
        | "gradientUnits"
        | "kernelMatrix"
        | "kernelUnitLength"
        | "keyPoints"
        | "keySplines"
        | "keyTimes"
        | "lengthAdjust"
        | "limitingConeAngle"
        | "markerHeight"
        | "markerUnits"
        | "markerWidth"
        | "maskContentUnits"
        | "maskUnits"
        | "numOctaves"
        | "pathLength"
        | "patternContentUnits"
        | "patternTransform"
        | "patternUnits"
        | "pointsAtX"
        | "pointsAtY"
        | "pointsAtZ"
        | "preserveAlpha"
        | "preserveAspectRatio"
        | "primitiveUnits"
        | "referrerPolicy"
        | "refX"
        | "refY"
        | "repeatCount"
        | "repeatDur"
        | "requiredExtensions"
        | "requiredFeatures"
        | "specularConstant"
        | "specularExponent"
        | "spreadMethod"
        | "startOffset"
        | "stdDeviation"
        | "stitchTiles"
        | "surfaceScale"
        | "systemLanguage"
        | "tableValues"
        | "targetX"
        | "targetY"
        | "textLength"
        | "viewBox"
        | "xChannelSelector"
        | "yChannelSelector"
        | "zoomAndPan" => name.to_string(),

        _ => {
            // Devs expect attributes in the HTML document to be lowercased.
            name.to_lowercase()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    // Test helper to make whitespace-insensitive comparisons for outputs where
    // internal formatting (spaces/newlines) is not semantically relevant.
    fn normalize_ws(s: &str) -> String {
        s.split_whitespace().collect::<Vec<_>>().join(" ")
    }

    #[test]
    fn test_unified_transform_attribute() {
        use crate::jsx_parser::{JSXAttribute, JSXAttributeValue};

        // Boolean attributes
        let attr_bool = JSXAttribute {
            name: "disabled".into(),
            value: None,
        };
        assert_eq!(
            transform_attribute(&attr_bool, TagType::Element),
            "disabled"
        );
        assert_eq!(
            transform_attribute(&attr_bool, TagType::Component),
            r#"{"disabled":true}"#
        );

        // String attributes (double quotes)
        let attr_str = JSXAttribute {
            name: "className".into(),
            value: Some(JSXAttributeValue::DoubleQuote("foo".into())),
        };
        assert_eq!(
            transform_attribute(&attr_str, TagType::Element),
            r#"class="foo""#
        );
        assert_eq!(
            transform_attribute(&attr_str, TagType::Component),
            r#"{"className":"foo"}"#
        );

        // Expression attributes
        let attr_expr = JSXAttribute {
            name: "id".into(),
            value: Some(JSXAttributeValue::Expression("id".into())),
        };
        assert_eq!(
            transform_attribute(&attr_expr, TagType::Element),
            r#"id="${id}""#
        );
        assert_eq!(
            transform_attribute(&attr_expr, TagType::Component),
            r#"{"id":id}"#
        );

        // Spread attributes
        let attr_spread = JSXAttribute {
            name: "...props".into(),
            value: None,
        };
        assert_eq!(
            transform_attribute(&attr_spread, TagType::Element),
            r#"${__jsxSpread(props)}"#
        );
        assert_eq!(
            transform_attribute(&attr_spread, TagType::Component),
            r#"{...props}"#
        );
    }

    #[test]
    fn test_basic_jsx_element() {
        let source = "const el = <div>Hello</div>;";
        let result = jsx_precompile(source).unwrap();
        assert_eq!(result, "const el = `<div>Hello</div>`;");
    }

    #[test]
    fn test_p_tag_with_strong_child() {
        let source = "const el = <p>Normal text <strong>Bold text</strong> some text</p>;";
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const el = `<p>Normal text <strong>Bold text</strong> some text</p>`;"
        );
    }

    #[test]
    fn test_jsx_with_attributes() {
        let source = "const el = <div className=\"container\" id=\"main\">Content</div>;";
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const el = `<div class=\"container\" id=\"main\">Content</div>`;"
        );
    }

    #[test]
    fn test_boolean_attribute_component() {
        let source = r#"const el = <CustomComponent disabled />;"#;
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const el = `${__jsxComponent(CustomComponent, [{\"disabled\":true}])}`;"
        );
    }

    #[test]
    fn test_component_children() {
        let source = r#"
            const Child = ({ children, ...props }) => <div><p>{ props.attr }</p>{children}</div>;
            const Parent = (props) => (
                <Child {...props}>
                    <p>Parent Content</p>
                    <p>Another Content</p>
                </Child>
            );
            const GrandParent = () => (
                <Parent attr="Test">
                    <p>GrandParent Content</p>
                </Parent>
            );
            const result = <GrandParent />;"#;
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
                result.replace('\n', "").split_whitespace().collect::<Vec<&str>>().join(" "),
                "const Child = ({ children, ...props }) => `<div><p>${ props.attr }</p>${children}</div>`; const Parent = (props) => ( `${__jsxComponent(Child, [{...props}], `<p>Parent Content</p> <p>Another Content</p>`)}` ); const GrandParent = () => ( `${__jsxComponent(Parent, [{\"attr\":\"Test\"}], `<p>GrandParent Content</p>`)}` ); const result = `${__jsxComponent(GrandParent, [])}`;"
            );
    }

    #[test]
    fn test_boolean_attribute_element() {
        let source = r#"const el = <input type="checkbox" disabled />;"#;
        let result = jsx_precompile(source).unwrap();
        assert_eq!(result, r#"const el = `<input type="checkbox" disabled/>`;"#);
    }

    #[test]
    fn test_normalize_html_attr_name() {
        let values = HashMap::from([
            ("accentHeight", "accent-height"),
            ("acceptCharset", "accept-charset"),
            ("alignmentBaseline", "alignment-baseline"),
            ("allowReorder", "allowReorder"),
            ("arabicForm", "arabic-form"),
            ("attributeName", "attributeName"),
            ("attributeType", "attributeType"),
            ("baseFrequency", "baseFrequency"),
            ("baselineShift", "baseline-shift"),
            ("baseProfile", "baseProfile"),
            ("calcMode", "calcMode"),
            ("capHeight", "cap-height"),
            ("className", "class"),
            ("clipPath", "clip-path"),
            ("clipPathUnits", "clipPathUnits"),
            ("clipRule", "clip-rule"),
            ("colorInterpolation", "color-interpolation"),
            ("colorInterpolationFilters", "color-interpolation-filters"),
            ("colorProfile", "color-profile"),
            ("colorRendering", "color-rendering"),
            ("contentScriptType", "content-script-type"),
            ("contentStyleType", "content-style-type"),
            ("diffuseConstant", "diffuseConstant"),
            ("dominantBaseline", "dominant-baseline"),
            ("edgeMode", "edgeMode"),
            ("enableBackground", "enable-background"),
            ("fillOpacity", "fill-opacity"),
            ("fillRule", "fill-rule"),
            ("filterUnits", "filterUnits"),
            ("floodColor", "flood-color"),
            ("floodOpacity", "flood-opacity"),
            ("fontFamily", "font-family"),
            ("fontSize", "font-size"),
            ("fontSizeAdjust", "font-size-adjust"),
            ("fontStretch", "font-stretch"),
            ("fontStyle", "font-style"),
            ("fontVariant", "font-variant"),
            ("fontWeight", "font-weight"),
            ("glyphName", "glyph-name"),
            ("glyphOrientationHorizontal", "glyph-orientation-horizontal"),
            ("glyphOrientationVertical", "glyph-orientation-vertical"),
            ("glyphRef", "glyphRef"),
            ("gradientTransform", "gradientTransform"),
            ("gradientUnits", "gradientUnits"),
            ("horizAdvX", "horiz-adv-x"),
            ("horizOriginX", "horiz-origin-x"),
            ("horizOriginY", "horiz-origin-y"),
            ("htmlFor", "for"),
            ("httpEquiv", "http-equiv"),
            ("imageRendering", "image-rendering"),
            ("kernelMatrix", "kernelMatrix"),
            ("kernelUnitLength", "kernelUnitLength"),
            ("keyPoints", "keyPoints"),
            ("keySplines", "keySplines"),
            ("keyTimes", "keyTimes"),
            ("lengthAdjust", "lengthAdjust"),
            ("letterSpacing", "letter-spacing"),
            ("lightingColor", "lighting-color"),
            ("limitingConeAngle", "limitingConeAngle"),
            ("markerEnd", "marker-end"),
            ("markerHeight", "markerHeight"),
            ("markerMid", "marker-mid"),
            ("markerStart", "marker-start"),
            ("markerUnits", "markerUnits"),
            ("markerWidth", "markerWidth"),
            ("maskContentUnits", "maskContentUnits"),
            ("maskUnits", "maskUnits"),
            ("numOctaves", "numOctaves"),
            ("overlinePosition", "overline-position"),
            ("overlineThickness", "overline-thickness"),
            ("paintOrder", "paint-order"),
            ("panose1", "panose-1"),
            ("pathLength", "pathLength"),
            ("patternContentUnits", "patternContentUnits"),
            ("patternTransform", "patternTransform"),
            ("patternUnits", "patternUnits"),
            ("pointsAtX", "pointsAtX"),
            ("pointsAtY", "pointsAtY"),
            ("pointsAtZ", "pointsAtZ"),
            ("pointerEvents", "pointer-events"),
            ("preserveAlpha", "preserveAlpha"),
            ("preserveAspectRatio", "preserveAspectRatio"),
            ("primitiveUnits", "primitiveUnits"),
            ("referrerPolicy", "referrerPolicy"),
            ("refX", "refX"),
            ("refY", "refY"),
            ("renderingIntent", "rendering-intent"),
            ("repeatCount", "repeatCount"),
            ("repeatDur", "repeatDur"),
            ("requiredExtensions", "requiredExtensions"),
            ("requiredFeatures", "requiredFeatures"),
            ("shapeRendering", "shape-rendering"),
            ("specularConstant", "specularConstant"),
            ("specularExponent", "specularExponent"),
            ("spreadMethod", "spreadMethod"),
            ("startOffset", "startOffset"),
            ("stdDeviation", "stdDeviation"),
            ("stitchTiles", "stitchTiles"),
            ("stopColor", "stop-color"),
            ("stopOpacity", "stop-opacity"),
            ("strikethroughPosition", "strikethrough-position"),
            ("strikethroughThickness", "strikethrough-thickness"),
            ("strokeDasharray", "stroke-dasharray"),
            ("strokeDashoffset", "stroke-dashoffset"),
            ("strokeLinecap", "stroke-linecap"),
            ("strokeLinejoin", "stroke-linejoin"),
            ("strokeMiterlimit", "stroke-miterlimit"),
            ("strokeOpacity", "stroke-opacity"),
            ("strokeWidth", "stroke-width"),
            ("surfaceScale", "surfaceScale"),
            ("systemLanguage", "systemLanguage"),
            ("tableValues", "tableValues"),
            ("targetX", "targetX"),
            ("targetY", "targetY"),
            ("textAnchor", "text-anchor"),
            ("textDecoration", "text-decoration"),
            ("textLength", "textLength"),
            ("textRendering", "text-rendering"),
            ("transformOrigin", "transform-origin"),
            ("underlinePosition", "underline-position"),
            ("underlineThickness", "underline-thickness"),
            ("unicodeBidi", "unicode-bidi"),
            ("unicodeRange", "unicode-range"),
            ("unitsPerEm", "units-per-em"),
            ("vAlphabetic", "v-alphabetic"),
            ("viewBox", "viewBox"),
            ("vectorEffect", "vector-effect"),
            ("vertAdvY", "vert-adv-y"),
            ("vertOriginX", "vert-origin-x"),
            ("vertOriginY", "vert-origin-y"),
            ("vHanging", "v-hanging"),
            ("vMathematical", "v-mathematical"),
            ("wordSpacing", "word-spacing"),
            ("writingMode", "writing-mode"),
            ("xChannelSelector", "xChannelSelector"),
            ("xHeight", "x-height"),
            ("xlinkActuate", "xlink:actuate"),
            ("xlinkArcrole", "xlink:arcrole"),
            ("xlinkHref", "href"),
            ("xlink:href", "href"),
            ("xlinkRole", "xlink:role"),
            ("xlinkShow", "xlink:show"),
            ("xlinkTitle", "xlink:title"),
            ("xlinkType", "xlink:type"),
            ("xmlBase", "xml:base"),
            ("xmlLang", "xml:lang"),
            ("xmlSpace", "xml:space"),
            ("yChannelSelector", "yChannelSelector"),
            ("zoomAndPan", "zoomAndPan"),
        ]);

        for (input, expected) in values {
            assert_eq!(normalize_html_attr_name(input), expected);
        }
    }

    #[test]
    fn test_jsx_with_dynamic_attributes() {
        let source = "const el = <div className={dynamicClass} {...spread} moto>Content</div>;";
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const el = `<div class=\"${dynamicClass}\"${__jsxSpread(spread)} moto>Content</div>`;"
        );
    }

    #[test]
    fn test_attribute_value_single_quotes() {
        let source = r#"const el = <div class='single-quote'></div>;"#;
        let result = jsx_precompile(source).unwrap();
        assert_eq!(result, "const el = `<div class='single-quote'></div>`;");
    }

    #[test]
    fn test_label_html_for() {
        let source = r#"const el = <label htmlFor={data}>My Label<input id="myInput" /></label>;"#;
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const el = `<label for=\"${data}\">My Label<input id=\"myInput\"/></label>`;"
        );
    }

    #[test]
    fn test_self_close_element() {
        let source =
            r#"const el = <label htmlFor="myInput">My Label<input id="myInput" /></label>;"#;
        let result = jsx_precompile(source).unwrap();
        let expected =
            "const el = `<label for=\"myInput\">My Label<input id=\"myInput\"/></label>`;";
        assert_eq!(result, expected);
    }

    #[test]
    fn test_web_components() {
        let source = r#"const el = <my-web-component attr="val" data-custom="5"><slot>Default</slot><h1 slot="header">Title</h1></my-web-component>;"#;
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const el = `<my-web-component attr=\"val\" data-custom=\"5\"><slot>Default</slot><h1 slot=\"header\">Title</h1></my-web-component>`;"
        );
    }

    #[test]
    fn test_self_close_component() {
        let source = "const el = <Component/>;";
        let result = jsx_precompile(source).unwrap();
        assert_eq!(result, "const el = `${__jsxComponent(Component, [])}`;");

        let source_with_space = "const el = <Component />;";
        let result_with_space = jsx_precompile(source_with_space).unwrap();
        assert_eq!(
            result_with_space,
            "const el = `${__jsxComponent(Component, [])}`;"
        );
    }

    #[test]
    fn test_underscore_components() {
        let source = "const el = <_CustomComponent prop=\"value\">child</_CustomComponent>;";
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const el = `${__jsxComponent(_CustomComponent, [{\"prop\":\"value\"}], `child`)}`;"
        );
    }

    #[test]
    fn test_dollar_sign_components() {
        let source = "const el = <$Component {...props}>content</$Component>;";
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const el = `${__jsxComponent($Component, [{...props}], `content`)}`;"
        );
    }

    #[test]
    fn test_nested_special_components() {
        let source = "const el = <_Parent><$Child>nested</$Child></_Parent>;";
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const el = `${__jsxComponent(_Parent, [], `${__jsxComponent($Child, [], `nested`)}`)}`;"
        );
    }

    #[test]
    fn test_component_with_multiple_attributes() {
        let source = r#"const el = <Component className="test-class" htmlFor="input-id" onClick={handleClick}>Content</Component>;"#;
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const el = `${__jsxComponent(Component, [{\"className\":\"test-class\"},{\"htmlFor\":\"input-id\"},{\"onClick\":handleClick}], `Content`)}`;"
        );
    }

    #[test]
    fn test_jsx_comment_removal() {
        let source = "const el = <div>Hello{/* comment with <tag> */}World</div>;";
        let result = jsx_precompile(source).unwrap();
        assert_eq!(result, "const el = `<div>HelloWorld</div>`;");
    }

    #[test]
    fn test_nested_components_and_element() {
        let source = r#"const el = <ParentComponent attr="val"  moto><ChildComponent {...spread}><div>Inner content</div></ChildComponent></ParentComponent>;"#;
        let result = jsx_precompile(source).unwrap();
        let expected = "const el = `${__jsxComponent(ParentComponent, [{\"attr\":\"val\"},{\"moto\":true}], `${__jsxComponent(ChildComponent, [{...spread}], `<div>Inner content</div>`)}`)}`;";
        assert_eq!(result, expected);
    }

    #[test]
    fn test_fragment_with_nested_components() {
        let source = r#"const el = <><A>Head</A><A class="n"><B><div>Inner</div></B></A></>;"#;
        let result = jsx_precompile(source).unwrap();
        let expected = r#"const el = `${__jsxComponent(A, [], `Head`)}${__jsxComponent(A, [{"class":"n"}], `${__jsxComponent(B, [], `<div>Inner</div>`)}`)}`;"#;
        assert_eq!(result, expected);
    }

    #[test]
    fn test_fragment_with_child_text() {
        let source = r#"const el = <><div>First Element</div><span>Second Element</span></>;"#;
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const el = `<div>First Element</div><span>Second Element</span>`;"
        );
    }

    #[test]
    fn test_fragment_with_child_expresion() {
        let source = r#"const el = <>
            <label>After Image</label>

            <input
                type="text"
            /><span>After Input</span>

            {description ? (
                <span>{description}</span>
            ) : (
                ""
            )}
        </>;"#;
        let result = jsx_precompile(source).unwrap();
        let expected = r#"const el = `<label>After Image</label> <input type="text"/><span>After Input</span> ${description ? ( `<span>${description}</span>` ) : ( "" )}`;"#;
        assert_eq!(normalize_ws(&result), normalize_ws(expected));
    }

    #[test]
    fn test_seo_component() {
        let source = r#"const el = <A><title>Query - An All-In-One Solution For Your Side-Projects And Startups</title><link rel="stylesheet" href={r}/></A>;"#;
        let result = jsx_precompile(source).unwrap();
        let expected = "const el = `${__jsxComponent(A, [], `<title>Query - An All-In-One Solution For Your Side-Projects And Startups</title><link rel=\"stylesheet\" href=\"${r}\"/>`)}`;";

        assert_eq!(result, expected);
    }

    #[test]
    fn test_nested_elements() {
        let source = r#"const el = <div><span class={classes}><span className={classes1}>Nested 1</span><span className={classes2}>Nested 2</span></span></div>;"#;
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const el = `<div><span class=\"${classes}\"><span class=\"${classes1}\">Nested 1</span><span class=\"${classes2}\">Nested 2</span></span></div>`;"
        );
    }

    #[test]
    fn test_dynamic_content() {
        let source = "const el = <div>{dynamicContent}</div>;";
        let result = jsx_precompile(source).unwrap();
        assert_eq!(result, "const el = `<div>${dynamicContent}</div>`;");
    }

    #[test]
    fn test_array_transformations() {
        let source = r#"const el = <div>{items.map(item => <li>{item}</li>)}</div>;"#;
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const el = `<div>${__jsxList(items.map(item => `<li>${item}</li>`))}</div>`;"
        );
    }

    #[test]
    fn test_flatten_trivial_nested_template_in_child() {
        let source = "const el = <div>{`${value}`}</div>;";
        let result = jsx_precompile(source).unwrap();
        assert_eq!(result, "const el = `<div>${value}</div>`;");
    }

    #[test]
    fn test_flat_map_and_for_each_transformations() {
        let src1 = r#"const el = <div>{items.flatMap(item => <li>{item}</li>)}</div>;"#;
        let out1 = jsx_precompile(src1).unwrap();
        assert_eq!(
            out1,
            "const el = `<div>${__jsxList(items.flatMap(item => `<li>${item}</li>`))}</div>`;"
        );

        let src2 = r#"const el = <div>{items.forEach(item => <li>{item}</li>)}</div>;"#;
        let out2 = jsx_precompile(src2).unwrap();
        assert_eq!(
            out2,
            "const el = `<div>${__jsxList(items.forEach(item => `<li>${item}</li>`))}</div>`;"
        );
    }

    #[test]
    fn test_no_empty_interpolation_artifacts() {
        let source = r#"const el = <div>{" "}{value}{""}</div>;"#;
        let result = jsx_precompile(source).unwrap();
        assert!(!result.contains("${}"));
    }

    #[test]
    fn test_loop_component_spread() {
        let source = r#"const el = <div>{posts.map((post) => <Component {...post} />)}</div>;"#;
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const el = `<div>${__jsxList(posts.map((post) => `${__jsxComponent(Component, [{...post}])}`))}</div>`;"
        );
    }

    #[test]
    fn test_filter_transformation() {
        let source = r#"const el = <div>{items.filter(item => item.active).map(item => <li>{item.name}</li>)}</div>;"#;
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const el = `<div>${__jsxList(items.filter(item => item.active).map(item => `<li>${item.name}</li>`))}</div>`;"
        );
    }

    #[test]
    fn test_reduce_transformation() {
        let source = r#"const el = <div>{items.reduce((acc, item) => acc + item, 0)}</div>;"#;
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const el = `<div>${__jsxList(items.reduce((acc, item) => acc + item, 0))}</div>`;"
        );
    }

    #[test]
    fn test_complex_jsx() {
        let source = r#"const TodoList = ({items, onToggle}) => (
<div className={`todo-list ${items.length ? 'has-items' : ''}`}>
<header className="todo-header">
<h1>{items.length} Tasks Remaining</h1>
<input type="text" {...inputProps} placeholder="Add new task" />
</header>
<ul className="todo-items">
{items.map((item, index) => (
<li key={item.id} className={item.completed ? 'completed' : ''}>
<input
type="checkbox"
checked={item.completed}
onChange={() => onToggle(index)}
/>
<span className="todo-text">{item.text}</span>
<button onClick={() => onDelete(item.id)}>Delete</button>
</li>
))}
</ul>
</div>)"#
            .trim();

        let result = jsx_precompile(source).unwrap();
        let expected = "const TodoList = ({items, onToggle}) => (\n`<div class=\"${`todo-list ${items.length ? 'has-items' : ''}`}\"><header class=\"todo-header\"><h1>${items.length} Tasks Remaining</h1> <input type=\"text\"${__jsxSpread(inputProps)} placeholder=\"Add new task\"/></header> <ul class=\"todo-items\">${__jsxList(items.map((item, index) => ( `<li key=\"${item.id}\" class=\"${item.completed ? 'completed' : ''}\"><input type=\"checkbox\" checked=\"${item.completed}\" onchange=\"${() => onToggle(index)}\"/> <span class=\"todo-text\">${item.text}</span> <button onclick=\"${() => onDelete(item.id)}\">Delete</button></li>` )))}</ul></div>`)";

        assert_eq!(normalize_ws(&result), normalize_ws(expected));
    }

    #[test]
    fn test_complex_jsx_with_conditions() {
        let input = r#"const el = <div className={`container ${theme}`}>
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
        let result = jsx_precompile(input).unwrap();
        let expected = "const el = `<div class=\"${`container ${theme}`}\"><header class=\"${styles.header}\"><h1>${title || \"Default Title\"}</h1> <nav>${__jsxList(menuItems.map((item, index) => ( `<a key=\"${index}\" href=\"${item.href}\" class=\"${`${styles.link} ${currentPath === item.href ? styles.active : ''}`}\">${item.icon && `${__jsxComponent(Icon, [{\"name\":item.icon}])}`} <span>${item.label}</span> ${item.badge && ( `${__jsxComponent(Badge, [{\"count\":item.badge},{\"type\":item.badgeType}])}` )}</a>` )))}</nav> ${user ? ( `<div class=\"${styles.userMenu}\"><img src=\"${user.avatar}\" alt=\"User avatar\"/> <span>${user.name}</span> <button onclick=\"${handleLogout}\">Logout</button></div>` ) : ( `<button class=\"${styles.loginButton}\" onclick=\"${handleLogin}\">Login</button>` )}</header> <main class=\"${styles.main}\">${loading ? ( `<div class=\"${styles.loader}\">${__jsxComponent(Spinner, [{\"size\":\"large\"},{\"color\":theme === 'dark' ? 'white' : 'black'}])}</div>` ) : error ? ( `${__jsxComponent(ErrorMessage, [{\"message\":error},{\"onRetry\":handleRetry}])}` ) : ( `${children}` )}</main> <footer class=\"${styles.footer}\"><p>&copy; ${currentYear} My Application</p></footer></div>`\n        ;";
        assert_eq!(normalize_ws(&result), normalize_ws(expected));
    }

    #[test]
    fn test_multiline_jsx_comment_removal() {
        let source = "const el = <div>Start{/* multi\nline\ncomment */}End</div>;";
        let result = jsx_precompile(source).unwrap();
        assert_eq!(result, "const el = `<div>StartEnd</div>`;");
    }

    #[test]
    fn test_no_angle_brackets_in_entity_string() {
        let source = "const s = '&lt;div&gt;'; const el = <pre>{s}</pre>;";
        let result = jsx_precompile(source).unwrap();
        assert_eq!(
            result,
            "const s = '&lt;div&gt;'; const el = `<pre>${s}</pre>`;"
        );
    }

    #[test]
    fn test_pre_code_block_with_template_literal() {
        let source = r#"const el = <pre className="bg-secondary/30 p-4 text-sm font-mono overflow-x-auto">
            <code className="text-foreground">
            {`# Standard Node.js deployment
 sxo build
 sxo start --port 3000

 # Docker deployment
 FROM node:20-alpine
 WORKDIR /app
 COPY . .
 RUN npm ci && npx sxo build
 CMD ["npx", "sxo", "start"]`}
            </code>
        </pre>;"#;
        let result = jsx_precompile(source).unwrap();
        // Basic structural assertions
        assert!(result
            .contains("<pre class=\"bg-secondary/30 p-4 text-sm font-mono overflow-x-auto\">"));
        assert!(result.contains("<code class=\"text-foreground\">"));
        // Ensure the template literal content survived and was wrapped as an expression
        assert!(result.contains("# Standard Node.js deployment"));
        assert!(result.contains("Docker deployment"));
        assert!(result.contains("npx sxo build"));
        assert!(result.contains("CMD [\"npx\", \"sxo\", \"start\"]"));
    }

    #[test]
    fn test_jsdoc_comment_with_apostrophe() {
        // Test that apostrophes in JSDoc comments don't trigger string literal mode
        let source = r#"/**
 * Performance section highlighting SXO's speed, routing, ESM, and dev server.
 * Semantic and accessible, with headings, lists, and ARIA roles.
 */
export function Performance() {
    return (<span>ooo</span>);
}"#;
        let result = jsx_precompile(source).unwrap();
        // The angle brackets in the JSX should be transformed to template literals, not escaped
        assert!(result.contains("`<span>ooo</span>`"));
        assert!(!result.contains("\\u003C"));
        assert!(!result.contains("\\u003E"));
    }

    #[test]
    fn test_single_line_comment_with_apostrophe() {
        // Test that apostrophes in single-line comments don't affect JSX
        let source = r#"// This is SXO's component
export function Test() {
    return <div>test</div>;
}"#;
        let result = jsx_precompile(source).unwrap();
        assert!(result.contains("`<div>test</div>`"));
        assert!(!result.contains("\\u003C"));
        assert!(!result.contains("\\u003E"));
    }

    #[test]
    fn test_classify_tag() {
        assert_eq!(classify_tag("div"), TagType::Element);
        assert_eq!(classify_tag("MyComponent"), TagType::Component);
        assert_eq!(classify_tag("_Component"), TagType::Component);
        assert_eq!(classify_tag("my-web-component"), TagType::WebComponent);
        assert_eq!(classify_tag("br"), TagType::Void);
        assert_eq!(classify_tag("input"), TagType::Void);
    }

    #[test]
    fn test_escape_sequence_preservation() {
        // Focus on expression attribute preserving JS escapes and text content handling of \t and \\.
        let source = r#"const el = <div data-text={"\"Hello\nWorld\\\""}>A\ttabbed\tline. Path: C:\\temp</div>;"#;
        let result = jsx_precompile(source).unwrap();
        let expected = r#"const el = `<div data-text="${"\"Hello\nWorld\\\""}">A\ttabbed\tline. Path: C:\\temp</div>`;"#;
        assert_eq!(result, expected);
    }

    #[test]
    fn test_format_diagnostic_basic() {
        let src = "first line\nsecond X line\nthird";
        let pos = src.find('X').unwrap();
        let msg = "Sample error";
        let out = format_diagnostic(src, pos, msg);

        assert!(out.contains("  --> "), "header missing: {out}");
        assert!(out.contains(":2:"), "line/col missing: {out}");
        assert!(out.contains("second X line"), "missing line content: {out}");

        let lines: Vec<&str> = out.lines().collect();
        assert!(lines.len() >= 5, "expected at least 5 lines");
        let caret_line = lines[3];
        let caret_col = caret_line.find('^').expect("caret expected");
        let x_col = "second ".len();
        let expected_col = 2usize.to_string().len() + 3 + x_col;
        assert_eq!(caret_col, expected_col);
    }

    #[test]
    fn test_format_diagnostic_position_zero_marks_entire_line() {
        let src = "oops here";
        let out = format_diagnostic(src, 0, "Err");
        let lines: Vec<&str> = out.lines().collect();

        // Expect header + line + full caret line
        assert!(lines[0].contains("  --> ") && lines[0].contains(":1:1"));
        assert!(lines[2].contains("1 | oops here"));
        assert_eq!(lines[3], "  | ^^^^^^^^^");
        assert!(lines[5].contains("= note: Err"));
    }

    #[test]
    fn test_format_diagnostic_tabs_alignment() {
        let line = "\tcol1\t\tcol2\tx";
        let src = format!("head\n{}\ntrail", line);
        let mid_line = src.lines().nth(1).unwrap();
        let pos_in_line = mid_line.find('x').unwrap();
        let abs_pos = src.lines().next().unwrap().len() + 1 + pos_in_line;
        let diag = format_diagnostic(&src, abs_pos, "Here");

        assert!(
            diag.contains("  --> ") && diag.contains(":2:"),
            "header missing: {diag}"
        );
        assert!(
            diag.contains(&mid_line.replace('\t', "    ")),
            "line content missing: {diag}"
        );
        // Caret should align under 'x' when accounting for 4-space tab expansion
        let expanded_prefix = mid_line[..pos_in_line].replace('\t', "    ");
        let expected_col = expanded_prefix.chars().count();
        let caret_line = diag.lines().nth(3).expect("caret line");
        let caret_col = caret_line.find('^').expect("caret not found");
        assert_eq!(
            caret_col,
            2usize.to_string().len() + 3 + expected_col,
            "caret misaligned:\n{diag}"
        );
    }

    #[test]
    fn test_jsx_precompile_aggregated_diagnostics_multiple_errors() {
        let src = "<div>\n<span>ok</div>\n<div class=\"oops>Bad</div>";
        let err = jsx_precompile(src).expect_err("expected aggregated parsing errors");
        let s = err.to_string();

        assert!(s.contains("JSX parsing error:"), "missing header: {s}");
        assert!(s.contains("  --> "), "missing diagnostics arrow: {s}");
        assert!(s.contains(":2:"), "missing line 2: {s}");
        assert!(s.contains(":3:"), "missing line 3: {s}");
        assert!(s.contains('^'), "missing caret: {s}");
        assert!(s.contains("= note:"), "missing note lines: {s}");
        assert!(
            s.contains("Mismatched closing tag"),
            "missing mismatch: {s}"
        );
        assert!(
            s.contains("Unterminated string literal"),
            "missing unterminated: {s}"
        );
    }
}
