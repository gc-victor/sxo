use wasm_bindgen::prelude::*;

mod rs;

pub use rs::jsx_parser;
pub use rs::jsx_transformer;

// When the `console_error_panic_hook` feature is enabled, we can call the
// `set_panic_hook` function at least once during initialization, and then
// we will get better error messages if our code ever panics.
#[cfg(feature = "console_error_panic_hook")]
pub fn set_panic_hook() {
    console_error_panic_hook::set_once();
}

// Initialize the WASM module
// WASM entrypoint for initialization
#[wasm_bindgen(start)]
pub fn init() {
    set_panic_hook();
}

/// Expose the Rust jsx_transformer function to JS/WASM
#[wasm_bindgen]
pub fn jsx(input: &str) -> Result<String, JsValue> {
    jsx_transformer::jsx_transformer(input).map_err(|e| JsValue::from_str(&format!("{e}")))
}

// TODO: bring test from query/jsx_parser
#[cfg(test)]
mod tests {
    use super::*;

    fn normalize_ws(s: &str) -> String {
        s.split_whitespace().collect::<Vec<_>>().join(" ")
    }

    #[test]
    fn test_transform_jsx_export() {
        let input = r#"\
            <App>
                <Header title="Welcome!" />
                <Content>
                    <p>This is a <strong>complex</strong> JSX example.</p>
                    <CustomComponent prop1={42} prop2="hello" />
                </Content>
                <Footer />
            </App>
        "#;
        let result = jsx(input);

        println!("Transformed JSX: {}", result.clone().unwrap());

        assert!(result.is_ok());
        let output = result.unwrap();
        let expected_snippet = "${__jsxComponent(App, [], `${__jsxComponent(Header, [{\"title\":\"Welcome!\"}])}${__jsxComponent(Content, [], `<p>This is a <strong>complex</strong> JSX example.</p>${__jsxComponent(CustomComponent, [{\"prop1\":42},{\"prop2\":\"hello\"}])}`)}${__jsxComponent(Footer, [])}`)}";
        assert!(normalize_ws(&output).contains(&normalize_ws(expected_snippet)));
    }
}
