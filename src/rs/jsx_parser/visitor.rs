use crate::jsx_parser::types::{JSXAttribute, JSXNode};

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
