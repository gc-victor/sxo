use crate::jsx_transformer::tags_attrs::{
    classify_tag, normalize_html_attr_name, transform_attribute, TagType,
};
use crate::jsx_transformer::{format_diagnostic, jsx_transformer};
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
    let result = jsx_transformer(source).unwrap();
    assert_eq!(result, "const el = `<div>Hello</div>`;");
}

#[test]
fn test_p_tag_with_strong_child() {
    let source = "const el = <p>Normal text <strong>Bold text</strong> some text</p>;";
    let result = jsx_transformer(source).unwrap();
    assert_eq!(
        result,
        "const el = `<p>Normal text <strong>Bold text</strong> some text</p>`;"
    );
}

#[test]
fn test_jsx_with_attributes() {
    let source = "const el = <div className=\"container\" id=\"main\">Content</div>;";
    let result = jsx_transformer(source).unwrap();
    assert_eq!(
        result,
        "const el = `<div class=\"container\" id=\"main\">Content</div>`;"
    );
}

#[test]
fn test_boolean_attribute_component() {
    let source = r#"const el = <CustomComponent disabled />;"#;
    let result = jsx_transformer(source).unwrap();
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
    let result = jsx_transformer(source).unwrap();
    assert_eq!(
            result.replace('\n', "").split_whitespace().collect::<Vec<&str>>().join(" "),
            "const Child = ({ children, ...props }) => `<div><p>${ props.attr }</p>${children}</div>`; const Parent = (props) => ( `${__jsxComponent(Child, [{...props}], `<p>Parent Content</p> <p>Another Content</p>`)}` ); const GrandParent = () => ( `${__jsxComponent(Parent, [{\"attr\":\"Test\"}], `<p>GrandParent Content</p>`)}` ); const result = `${__jsxComponent(GrandParent, [])}`;"
        );
}

#[test]
fn test_boolean_attribute_element() {
    let source = r#"const el = <input type="checkbox" disabled />;"#;
    let result = jsx_transformer(source).unwrap();
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
    let result = jsx_transformer(source).unwrap();
    assert_eq!(
        result,
        "const el = `<div class=\"${dynamicClass}\"${__jsxSpread(spread)} moto>Content</div>`;"
    );
}

#[test]
fn test_attribute_value_single_quotes() {
    let source = r#"const el = <div class='single-quote'></div>;"#;
    let result = jsx_transformer(source).unwrap();
    assert_eq!(result, "const el = `<div class='single-quote'></div>`;");
}

#[test]
fn test_label_html_for() {
    let source = r#"const el = <label htmlFor={data}>My Label<input id="myInput" /></label>;"#;
    let result = jsx_transformer(source).unwrap();
    assert_eq!(
        result,
        "const el = `<label for=\"${data}\">My Label<input id=\"myInput\"/></label>`;"
    );
}

#[test]
fn test_self_close_element() {
    let source = r#"const el = <label htmlFor="myInput">My Label<input id="myInput" /></label>;"#;
    let result = jsx_transformer(source).unwrap();
    let expected = "const el = `<label for=\"myInput\">My Label<input id=\"myInput\"/></label>`;";
    assert_eq!(result, expected);
}

#[test]
fn test_web_components() {
    let source = r#"const el = <my-web-component attr="val" data-custom="5"><slot>Default</slot><h1 slot="header">Title</h1></my-web-component>;"#;
    let result = jsx_transformer(source).unwrap();
    assert_eq!(
        result,
        "const el = `<my-web-component attr=\"val\" data-custom=\"5\"><slot>Default</slot><h1 slot=\"header\">Title</h1></my-web-component>`;"
    );
}

#[test]
fn test_self_close_component() {
    let source = "const el = <Component/>;";
    let result = jsx_transformer(source).unwrap();
    assert_eq!(result, "const el = `${__jsxComponent(Component, [])}`;");

    let source_with_space = "const el = <Component />;";
    let result_with_space = jsx_transformer(source_with_space).unwrap();
    assert_eq!(
        result_with_space,
        "const el = `${__jsxComponent(Component, [])}`;"
    );
}

#[test]
fn test_underscore_components() {
    let source = "const el = <_CustomComponent prop=\"value\">child</_CustomComponent>;";
    let result = jsx_transformer(source).unwrap();
    assert_eq!(
        result,
        "const el = `${__jsxComponent(_CustomComponent, [{\"prop\":\"value\"}], `child`)}`;"
    );
}

#[test]
fn test_dollar_sign_components() {
    let source = "const el = <$Component {...props}>content</$Component>;";
    let result = jsx_transformer(source).unwrap();
    assert_eq!(
        result,
        "const el = `${__jsxComponent($Component, [{...props}], `content`)}`;"
    );
}

#[test]
fn test_nested_special_components() {
    let source = "const el = <_Parent><$Child>nested</$Child></_Parent>;";
    let result = jsx_transformer(source).unwrap();
    assert_eq!(
        result,
        "const el = `${__jsxComponent(_Parent, [], `${__jsxComponent($Child, [], `nested`)}`)}`;"
    );
}

#[test]
fn test_component_with_multiple_attributes() {
    let source = r#"const el = <Component className="test-class" htmlFor="input-id" onClick={handleClick}>Content</Component>;"#;
    let result = jsx_transformer(source).unwrap();
    assert_eq!(
        result,
        "const el = `${__jsxComponent(Component, [{\"className\":\"test-class\"},{\"htmlFor\":\"input-id\"},{\"onClick\":handleClick}], `Content`)}`;"
    );
}

#[test]
fn test_jsx_comment_removal() {
    let source = "const el = <div>Hello{/* comment with <tag> */}World</div>;";
    let result = jsx_transformer(source).unwrap();
    assert_eq!(result, "const el = `<div>HelloWorld</div>`;");
}

#[test]
fn test_nested_components_and_element() {
    let source = r#"const el = <ParentComponent attr="val"  moto><ChildComponent {...spread}><div>Inner content</div></ChildComponent></ParentComponent>;"#;
    let result = jsx_transformer(source).unwrap();
    let expected = "const el = `${__jsxComponent(ParentComponent, [{\"attr\":\"val\"},{\"moto\":true}], `${__jsxComponent(ChildComponent, [{...spread}], `<div>Inner content</div>`)}`)}`;";
    assert_eq!(result, expected);
}

#[test]
fn test_fragment_with_nested_components() {
    let source = r#"const el = <><A>Head</A><A class="n"><B><div>Inner</div></B></A></>;"#;
    let result = jsx_transformer(source).unwrap();
    let expected = r#"const el = `${__jsxComponent(A, [], `Head`)}${__jsxComponent(A, [{"class":"n"}], `${__jsxComponent(B, [], `<div>Inner</div>`)}`)}`;"#;
    assert_eq!(result, expected);
}

#[test]
fn test_fragment_with_child_text() {
    let source = r#"const el = <><div>First Element</div><span>Second Element</span></>;"#;
    let result = jsx_transformer(source).unwrap();
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
    let result = jsx_transformer(source).unwrap();
    let expected = r#"const el = `<label>After Image</label> <input type="text"/><span>After Input</span> ${description ? ( `<span>${description}</span>` ) : ( "" )}`;"#;
    assert_eq!(normalize_ws(&result), normalize_ws(expected));
}

#[test]
fn test_seo_component() {
    let source = r#"const el = <A><title>Query - An All-In-One Solution For Your Side-Projects And Startups</title><link rel="stylesheet" href={r}/></A>;"#;
    let result = jsx_transformer(source).unwrap();
    let expected = "const el = `${__jsxComponent(A, [], `<title>Query - An All-In-One Solution For Your Side-Projects And Startups</title><link rel=\"stylesheet\" href=\"${r}\"/>`)}`;";

    assert_eq!(result, expected);
}

#[test]
fn test_nested_elements() {
    let source = r#"const el = <div><span class={classes}><span className={classes1}>Nested 1</span><span className={classes2}>Nested 2</span></span></div>;"#;
    let result = jsx_transformer(source).unwrap();
    assert_eq!(
        result,
        "const el = `<div><span class=\"${classes}\"><span class=\"${classes1}\">Nested 1</span><span class=\"${classes2}\">Nested 2</span></span></div>`;"
    );
}

#[test]
fn test_dynamic_content() {
    let source = "const el = <div>{dynamicContent}</div>;";
    let result = jsx_transformer(source).unwrap();
    assert_eq!(result, "const el = `<div>${dynamicContent}</div>`;");
}

#[test]
fn test_array_transformations() {
    let source = r#"const el = <div>{items.map(item => <li>{item}</li>)}</div>;"#;
    let result = jsx_transformer(source).unwrap();
    assert_eq!(
        result,
        "const el = `<div>${__jsxList(items.map(item => `<li>${item}</li>`))}</div>`;"
    );
}

#[test]
fn test_flatten_trivial_nested_template_in_child() {
    let source = "const el = <div>{`${value}`}</div>;";
    let result = jsx_transformer(source).unwrap();
    assert_eq!(result, "const el = `<div>${value}</div>`;");
}

#[test]
fn test_flat_map_and_for_each_transformations() {
    let src1 = r#"const el = <div>{items.flatMap(item => <li>{item}</li>)}</div>;"#;
    let out1 = jsx_transformer(src1).unwrap();
    assert_eq!(
        out1,
        "const el = `<div>${__jsxList(items.flatMap(item => `<li>${item}</li>`))}</div>`;"
    );

    let src2 = r#"const el = <div>{items.forEach(item => <li>{item}</li>)}</div>;"#;
    let out2 = jsx_transformer(src2).unwrap();
    assert_eq!(
        out2,
        "const el = `<div>${__jsxList(items.forEach(item => `<li>${item}</li>`))}</div>`;"
    );
}

#[test]
fn test_no_empty_interpolation_artifacts() {
    let source = r#"const el = <div>{" "}{value}{""}</div>;"#;
    let result = jsx_transformer(source).unwrap();
    assert!(!result.contains("${}"));
}

#[test]
fn test_loop_component_spread() {
    let source = r#"const el = <div>{posts.map((post) => <Component {...post} />)}</div>;"#;
    let result = jsx_transformer(source).unwrap();
    assert_eq!(
        result,
        "const el = `<div>${__jsxList(posts.map((post) => `${__jsxComponent(Component, [{...post}])}`))}</div>`;"
    );
}

#[test]
fn test_filter_transformation() {
    let source = r#"const el = <div>{items.filter(item => item.active).map(item => <li>{item.name}</li>)}</div>;"#;
    let result = jsx_transformer(source).unwrap();
    assert_eq!(
        result,
        "const el = `<div>${__jsxList(items.filter(item => item.active).map(item => `<li>${item.name}</li>`))}</div>`;"
    );
}

#[test]
fn test_reduce_transformation() {
    let source = r#"const el = <div>{items.reduce((acc, item) => acc + item, 0)}</div>;"#;
    let result = jsx_transformer(source).unwrap();
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

    let result = jsx_transformer(source).unwrap();
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
    let result = jsx_transformer(input).unwrap();
    let expected = "const el = `<div class=\"${`container ${theme}`}\"><header class=\"${styles.header}\"><h1>${title || \"Default Title\"}</h1> <nav>${__jsxList(menuItems.map((item, index) => ( `<a key=\"${index}\" href=\"${item.href}\" class=\"${`${styles.link} ${currentPath === item.href ? styles.active : ''}`}\">${item.icon && `${__jsxComponent(Icon, [{\"name\":item.icon}])}`} <span>${item.label}</span> ${item.badge && ( `${__jsxComponent(Badge, [{\"count\":item.badge},{\"type\":item.badgeType}])}` )}</a>` )))}</nav> ${user ? ( `<div class=\"${styles.userMenu}\"><img src=\"${user.avatar}\" alt=\"User avatar\"/> <span>${user.name}</span> <button onclick=\"${handleLogout}\">Logout</button></div>` ) : ( `<button class=\"${styles.loginButton}\" onclick=\"${handleLogin}\">Login</button>` )}</header> <main class=\"${styles.main}\">${loading ? ( `<div class=\"${styles.loader}\">${__jsxComponent(Spinner, [{\"size\":\"large\"},{\"color\":theme === 'dark' ? 'white' : 'black'}])}</div>` ) : error ? ( `${__jsxComponent(ErrorMessage, [{\"message\":error},{\"onRetry\":handleRetry}])}` ) : ( `${children}` )}</main> <footer class=\"${styles.footer}\"><p>&copy; ${currentYear} My Application</p></footer></div>`\n        ;";
    assert_eq!(normalize_ws(&result), normalize_ws(expected));
}

#[test]
fn test_multiline_jsx_comment_removal() {
    let source = "const el = <div>Start{/* multi\nline\ncomment */}End</div>;";
    let result = jsx_transformer(source).unwrap();
    assert_eq!(result, "const el = `<div>StartEnd</div>`;");
}

#[test]
fn test_no_angle_brackets_in_entity_string() {
    let source = "const s = '&lt;div&gt;'; const el = <pre>{s}</pre>;";
    let result = jsx_transformer(source).unwrap();
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
    let result = jsx_transformer(source).unwrap();
    // Basic structural assertions
    assert!(
        result.contains("<pre class=\"bg-secondary/30 p-4 text-sm font-mono overflow-x-auto\">")
    );
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
    let result = jsx_transformer(source).unwrap();
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
    let result = jsx_transformer(source).unwrap();
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
    let result = jsx_transformer(source).unwrap();
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
    let err = jsx_transformer(src).expect_err("expected aggregated parsing errors");
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

#[test]
fn test_jsdoc_comment_with_jsx_like_syntax() {
    // This tests the specific issue reported where JSDoc comments containing
    // JSX-like syntax (e.g., <head> tags) were being parsed as JSX
    let source = r#"/**
 * NOTE: SXO server page using JSX (no template strings, no Preact/React).
 * The default export returns JSX that SXO renders on the server.
 * `head` is an object SXO maps to <head> tags.
 */

export const head = { title: "Test Page" };

export default function TestPage() {
    return <div>Hello World</div>;
}"#;

    let result = jsx_transformer(source).unwrap();

    // Should not throw an error about unclosed <head> tag
    assert!(result.contains("export const head"));
    assert!(result.contains("export default function TestPage"));
    assert!(result.contains("`<div>Hello World</div>`"));

    // Comments should be removed, leaving clean code
    assert!(!result.contains("NOTE"));
    assert!(!result.contains("<head> tags"));
}

#[test]
fn test_multiple_comment_types_with_jsx_syntax() {
    let source = r#"/**
 * JSDoc with <header>JSX</header>
 */

/* Block comment with <span>JSX</span> */
{/* JSX comment with <footer>JSX</footer> */}

export default () => <p>Content</p>;"#;

    let result = jsx_transformer(source).unwrap();

    // Should not throw parsing errors
    assert!(result.contains("`<p>Content</p>`"));

    // JSDoc, block, and JSX comments should be removed
    assert!(!result.contains("JSDoc with"));
    assert!(!result.contains("Block comment"));
    assert!(!result.contains("JSX comment"));
}

#[test]
fn test_nested_jsx_in_comments() {
    let source = r#"/**
 * Complex example: <Component prop={<Child />} />
 * More complex: {items.map(item => <Item key={item.id} />)}
 */
export default () => <section>Test</section>;"#;

    let result = jsx_transformer(source).unwrap();

    // Should not throw parsing errors despite complex JSX in comments
    assert!(result.contains("`<section>Test</section>`"));

    // Complex JSX in comments should be removed
    assert!(!result.contains("Complex example"));
    assert!(!result.contains("More complex"));
}

#[test]
fn test_mixed_comment_and_jsx_expressions() {
    let source = r#"/* Comment with <Component attr="value" /> */
export default () => (
  <div>
    {/* Inline JSX comment with <span>content</span> */}
    <p>Real content</p>
  </div>
);"#;

    let result = jsx_transformer(source).unwrap();

    // Should transform real JSX
    assert!(result.contains("`<div>"));
    assert!(result.contains("<p>Real content</p>"));

    // Block and JSX comments should be removed
    assert!(!result.contains("Comment with"));
    assert!(!result.contains("Inline JSX comment"));
}
