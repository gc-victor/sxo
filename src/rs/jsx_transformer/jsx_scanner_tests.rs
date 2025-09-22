#[cfg(test)]
mod tests {
    use crate::jsx_transformer::jsx_scanner::find_next_jsx_start;

    // Local helper to collect all candidate JSX start positions using the production scanner.
    fn collect_jsx_starts(src: &str) -> Vec<usize> {
        let mut out = Vec::new();
        let mut pos = 0;
        while let Some(i) = find_next_jsx_start(src, pos) {
            out.push(i);
            pos = i + 1;
            if pos >= src.len() {
                break;
            }
        }
        out
    }

    #[test]
    fn finds_simple_jsx() {
        let src = "const el = <div id=\"a\"/>;";
        let at = find_next_jsx_start(src, 0).expect("should find <");
        assert_eq!(at, src.find("<div").unwrap());
    }

    #[test]
    fn ignores_lt_in_line_comment() {
        let src = "// <div> not jsx\nlet x = 1; <span/>";
        let at = find_next_jsx_start(src, 0).expect("should find <span/>");
        assert_eq!(at, src.find("<span").unwrap());
    }

    #[test]
    fn ignores_lt_in_block_comment() {
        let src = "/* <div> */ let x = 1; /* <a> */ <b/>";
        let positions = collect_jsx_starts(src);
        assert_eq!(positions, vec![src.find("<b").unwrap()]);
    }

    #[test]
    fn ignores_lt_in_single_and_double_quoted_strings() {
        let src = "const s1 = \"<div>\"; const s2 = '<span>'; <p/>";
        let at = find_next_jsx_start(src, 0).unwrap();
        assert_eq!(at, src.find("<p").unwrap());
    }

    #[test]
    fn ignores_lt_in_template_literal_raw_part() {
        let src = "const t = `hello <world>`; const ok = 1; <div/>";
        let at = find_next_jsx_start(src, 0).unwrap();
        assert_eq!(at, src.find("<div").unwrap());
    }

    #[test]
    fn handles_template_literal_with_interpolation_and_nested_template() {
        let src = "const t = `X ${ `Y ${1+2}` } Z`; // done\n<section/>";
        let at = find_next_jsx_start(src, 0).unwrap();
        assert_eq!(at, src.find("<section").unwrap());
    }

    #[test]
    fn regex_literals_do_not_trigger_line_comment_and_allow_slashes_inside() {
        let src = r#"const re = /https:\/\/example\.com\/\//g; // trailing
<div/>"#;
        let at = find_next_jsx_start(src, 0).unwrap();
        assert_eq!(at, src.find("<div").unwrap());
    }

    #[test]
    fn division_vs_comparison_does_not_confuse_scanner() {
        // Relational '<' is filtered by a lookahead; the scanner skips it and finds the real JSX later.
        let src = "let r = a / b < c ? 1 : 2; const x = 1; <tag/>";

        let at = find_next_jsx_start(src, 0).unwrap();
        assert_eq!(at, src.find("<tag").unwrap());
    }

    #[test]
    fn crlf_line_comments() {
        let src = "a\r\n// <div>\r\nb\r\n<section/>\r\n";
        let at = find_next_jsx_start(src, 0).unwrap();
        assert_eq!(at, src.find("<section").unwrap());
    }

    #[test]
    fn multiple_candidates_are_collected_in_order() {
        let src = "x; <a/><b/><c/>";
        let all = collect_jsx_starts(src);
        assert_eq!(
            all,
            vec![
                src.find("<a").unwrap(),
                src.find("<b").unwrap(),
                src.find("<c").unwrap()
            ]
        );
    }

    #[test]
    fn regex_char_class_and_flags() {
        let src = r#"const re = /[a-zA-Z_\/]+\/\d+/gi; <x/>"#;
        let at = find_next_jsx_start(src, 0).unwrap();
        assert_eq!(at, src.find("<x").unwrap());
    }

    #[test]
    fn keywords_before_operand_allow_regex_start() {
        let src = r#"return /pattern/.test(s) ? 1 : 0; /* done */ <ok/>"#;
        let at = find_next_jsx_start(src, 0).unwrap();
        assert_eq!(at, src.find("<ok").unwrap());
    }

    #[test]
    fn template_expr_with_comments_and_regex_inside() {
        let src = "const t = `A ${ // c1\n /x/.test(y) && `${1}` } B`; <div/>";
        let at = find_next_jsx_start(src, 0).unwrap();
        assert_eq!(at, src.find("<div").unwrap());
    }

    #[test]
    fn does_not_report_lt_inside_template_expression_raw_segment() {
        // The raw segment of a template literal (outside ${}) should not produce a candidate.
        let src = "const t = `raw < not jsx ${ 1 + 2 } tail`;\n<span/>";
        let at = find_next_jsx_start(src, 0).unwrap();
        assert_eq!(at, src.find("<span").unwrap());
    }

    #[test]
    fn handles_mixed_contexts_before_first_jsx() {
        let src = r#"
// <h1> in comment
const url = "http://example.com/<path>";
const regex = /a\/b\/c\/\<not\>/gi;
/* <x> */
const t = `X ${ `Y ${ /* c */ 1 }` } Z`;
<div id="ok"/>
"#;
        let at = find_next_jsx_start(src, 0).unwrap();
        assert_eq!(at, src.find("<div").unwrap());
    }

    #[test]
    fn ignores_lt_in_multi_line_block_comment() {
        let src = "/* line 1 <div>\nline 2 <span>\nline 3 </span> */\nlet x = 1; <ok/>";
        let at = find_next_jsx_start(src, 0).unwrap();
        assert_eq!(at, src.find("<ok").unwrap());
    }

    #[test]
    fn ignores_lt_in_jsdoc_block_comment() {
        let src = "/**\n * <header>\n * some docs\n */\nconst val = 42; <x/>";
        let at = find_next_jsx_start(src, 0).unwrap();
        assert_eq!(at, src.find("<x").unwrap());
    }
}
