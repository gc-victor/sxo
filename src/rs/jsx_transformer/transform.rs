use super::errors::JSXError;
use super::tags_attrs::{
    classify_tag, transform_component_attributes, transform_element_attributes, TagType,
};
use crate::jsx_parser::{walk_node, JSXAttribute, JSXNode, JSXVisitor};

// Common constants used across the transformer.
const OPENING_BRACKET: &str = "<";

pub(crate) fn transform_to_template(ast: &JSXNode) -> Result<String, JSXError> {
    let mut transformer = TemplateTransformer::new_root();
    walk_node(&mut transformer, ast);
    transformer.finalize()
}

// Internal stack frames used while visiting the AST.
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
        if let Some(err) = self.error.take() {
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
                match super::jsx_transformer(expr) {
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

// TemplateBuilder centralizes child assembly and flattens trivial nested templates.
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

// Scans an expression to determine if it should be wrapped with __jsxList(...).
// It ignores content inside strings and template literals, and detects calls on
// array-producing/copying methods (map/flatMap/filter/concat/flat/...).
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

// Returns Some(inner) when input is a backtick template containing only a single interpolation: `${inner}`
#[inline]
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
#[inline]
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