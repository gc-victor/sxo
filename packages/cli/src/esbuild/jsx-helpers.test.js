import assert from "node:assert/strict";
import { describe, test } from "node:test";
import "./jsx-helpers.js";

const assertRenders = (result, expected) => assert.strictEqual(result.toString(), expected);

describe("__jsxRender", () => {
    test("should filter false from array", () => {
        assert.strictEqual(__jsxRender([false, "<X/>"]), "<X/>");
    });

    test("should preserve number 0 in array", () => {
        assert.strictEqual(__jsxRender([0, "<X/>"]), "0<X/>");
    });

    test("should handle empty array", () => {
        assert.strictEqual(__jsxRender([]), "");
    });

    test("should pass through non-array value unchanged", () => {
        assert.strictEqual(__jsxRender("<div/>"), "<div/>");
    });

    test("should return empty string for null scalar", () => {
        assert.strictEqual(__jsxRender(null), "");
    });

    test("should preserve number 0 scalar", () => {
        assert.strictEqual(__jsxRender(0), 0);
    });

    test("should pass through objects unchanged", () => {
        const obj = { foo: "bar" };
        assert.strictEqual(__jsxRender(obj), obj);
    });
});

test("should handle nested elements with dynamic content", () => {
    const items = ["one", "two"];
    const result = `<div class="test"><ul>${__jsxRender(items.map((item) => `<li>${item}</li>`))}</ul></div>`;
    assertRenders(result, '<div class="test"><ul><li>one</li><li>two</li></ul></div>');
});

test("should handle nested component composition", () => {
    const Child = ({ children, ...props }) => `<div><p>${props.attr}</p>${children}</div>`;
    const Parent = (props) => __jsxComponent(Child, [props], "<p>Parent Content</p><p>Another Content</p>");
    const GrandParent = () => __jsxComponent(Parent, [{ attr: "Test" }]);
    assertRenders(__jsxComponent(GrandParent, []), "<div><p>Test</p><p>Parent Content</p><p>Another Content</p></div>");
});

test("should handle complex jsx with conditions", () => {
    const mockMenuItems = [
        { href: "/home", icon: "home", label: "Home" },
        { href: "/profile", icon: "user", label: "Profile", badge: 3, badgeType: "notification" },
    ];
    const mockUser = { avatar: "/avatar.jpg", name: "John Doe" };
    const mockTheme = "light";
    const mockCurrentPath = "/home";
    const mockStyles = { header: "header-class", link: "link-class", active: "active-class" };
    const Icon = (props) => `<i>${props.name}</i>`;
    const Badge = (props) => `<span type="${props.type}">${props.count}</span>`;

    const result = `
        <div class="${`container ${mockTheme}`}">
            <header class="${mockStyles.header}">
                <h1>${"Default Title"}</h1>
                <nav>${__jsxRender(
                    mockMenuItems.map(
                        (item, index) =>
                            `<a key="${index}" href="${item.href}" class="${`${mockStyles.link} ${mockCurrentPath === item.href ? mockStyles.active : ""}`}">
                        ${item.icon && __jsxComponent(Icon, { name: item.icon })}
                        <span>${item.label}</span>
                        ${item.badge ? __jsxComponent(Badge, { count: item.badge, type: item.badgeType }) : ""}
                    </a>`,
                    ),
                )}</nav>
                ${
                    mockUser
                        ? `<div class="user-menu">
                        <img src="${mockUser.avatar}" alt="User avatar" />
                        <span>${mockUser.name}</span>
                        <button onclick="handleLogout">Logout</button>
                    </div>`
                        : `<button class="login-button" onclick="handleLogin">Login</button>`
                }
            </header>
        </div>
    `;

    const expected =
        '<div class="container light"><header class="header-class"><h1>Default Title</h1><nav><a key="0" href="/home" class="link-class active-class"><i>home</i><span>Home</span></a><a key="1" href="/profile" class="link-class "><i>user</i><span>Profile</span><span type="notification">3</span></a></nav><div class="user-menu"><img src="/avatar.jpg" alt="User avatar" /><span>John Doe</span><button onclick="handleLogout">Logout</button></div></header></div>';

    assert.strictEqual(result.toString().replace(/\s+/g, ""), expected.replace(/\s+/g, ""));
});

test("should normalize HTML attributes", () => {
    const attributeMappings = {
        accentHeight: "accent-height",
        acceptCharset: "accept-charset",
        alignmentBaseline: "alignment-baseline",
        allowReorder: "allowReorder",
        arabicForm: "arabic-form",
        attributeName: "attributeName",
        attributeType: "attributeType",
        baseFrequency: "baseFrequency",
        baselineShift: "baseline-shift",
        baseProfile: "baseProfile",
        calcMode: "calcMode",
        capHeight: "cap-height",
        className: "class",
        clipPath: "clip-path",
        clipPathUnits: "clipPathUnits",
        clipRule: "clip-rule",
        colorInterpolation: "color-interpolation",
        colorInterpolationFilters: "color-interpolation-filters",
        colorProfile: "color-profile",
        colorRendering: "color-rendering",
        contentScriptType: "contentScriptType",
        contentStyleType: "contentStyleType",
        diffuseConstant: "diffuseConstant",
        dominantBaseline: "dominant-baseline",
        edgeMode: "edgeMode",
        enableBackground: "enableBackground",
        fillOpacity: "fill-opacity",
        fillRule: "fill-rule",
        filterUnits: "filterUnits",
        floodColor: "flood-color",
        floodOpacity: "flood-opacity",
        fontFamily: "font-family",
        fontSize: "font-size",
        fontSizeAdjust: "font-size-adjust",
        fontStretch: "font-stretch",
        fontStyle: "font-style",
        fontVariant: "font-variant",
        fontWeight: "font-weight",
        glyphName: "glyph-name",
        glyphOrientationHorizontal: "glyph-orientation-horizontal",
        glyphOrientationVertical: "glyph-orientation-vertical",
        glyphRef: "glyphRef",
        gradientTransform: "gradientTransform",
        gradientUnits: "gradientUnits",
        horizAdvX: "horiz-adv-x",
        horizOriginX: "horiz-origin-x",
        horizOriginY: "horiz-origin-y",
        htmlFor: "for",
        httpEquiv: "http-equiv",
        imageRendering: "image-rendering",
        kernelMatrix: "kernelMatrix",
        kernelUnitLength: "kernelUnitLength",
        keyPoints: "keyPoints",
        keySplines: "keySplines",
        keyTimes: "keyTimes",
        lengthAdjust: "lengthAdjust",
        letterSpacing: "letter-spacing",
        lightingColor: "lighting-color",
        limitingConeAngle: "limitingConeAngle",
        markerEnd: "marker-end",
        markerHeight: "markerHeight",
        markerMid: "marker-mid",
        markerStart: "marker-start",
        markerUnits: "markerUnits",
        markerWidth: "markerWidth",
        maskContentUnits: "maskContentUnits",
        maskUnits: "maskUnits",
        numOctaves: "numOctaves",
        overlinePosition: "overline-position",
        overlineThickness: "overline-thickness",
        paintOrder: "paint-order",
        pathLength: "pathLength",
        patternContentUnits: "patternContentUnits",
        patternTransform: "patternTransform",
        patternUnits: "patternUnits",
        pointsAtX: "pointsAtX",
        pointsAtY: "pointsAtY",
        pointsAtZ: "pointsAtZ",
        pointerEvents: "pointer-events",
        preserveAlpha: "preserveAlpha",
        preserveAspectRatio: "preserveAspectRatio",
        primitiveUnits: "primitiveUnits",
        referrerPolicy: "referrerPolicy",
        refX: "refX",
        refY: "refY",
        repeatCount: "repeatCount",
        repeatDur: "repeatDur",
        requiredExtensions: "requiredExtensions",
        requiredFeatures: "requiredFeatures",
        shapeRendering: "shape-rendering",
        specularConstant: "specularConstant",
        specularExponent: "specularExponent",
        spreadMethod: "spreadMethod",
        startOffset: "startOffset",
        stdDeviation: "stdDeviation",
        stitchTiles: "stitchTiles",
        stopColor: "stop-color",
        stopOpacity: "stop-opacity",
        strikethroughPosition: "strikethrough-position",
        strikethroughThickness: "strikethrough-thickness",
        strokeDasharray: "stroke-dasharray",
        strokeDashoffset: "stroke-dashoffset",
        strokeLinecap: "stroke-linecap",
        strokeLinejoin: "stroke-linejoin",
        strokeMiterlimit: "stroke-miterlimit",
        strokeOpacity: "stroke-opacity",
        strokeWidth: "stroke-width",
        surfaceScale: "surfaceScale",
        systemLanguage: "systemLanguage",
        tableValues: "tableValues",
        targetX: "targetX",
        targetY: "targetY",
        textAnchor: "text-anchor",
        textDecoration: "text-decoration",
        textLength: "textLength",
        textRendering: "text-rendering",
        transformOrigin: "transform-origin",
        underlinePosition: "underline-position",
        underlineThickness: "underline-thickness",
        unicodeBidi: "unicode-bidi",
        unicodeRange: "unicode-range",
        unitsPerEm: "units-per-em",
        vAlphabetic: "v-alphabetic",
        viewBox: "viewBox",
        vectorEffect: "vector-effect",
        vertAdvY: "vert-adv-y",
        vertOriginX: "vert-origin-x",
        vertOriginY: "vert-origin-y",
        vHanging: "v-hanging",
        vMathematical: "v-mathematical",
        wordSpacing: "word-spacing",
        writingMode: "writing-mode",
        xChannelSelector: "xChannelSelector",
        xHeight: "x-height",
        yChannelSelector: "yChannelSelector",
        zoomAndPan: "zoomAndPan",
    };
    for (const [input, expected] of Object.entries(attributeMappings)) {
        assert.strictEqual(__jsxSpread({ [input]: "test" }), ` ${expected}="test"`);
    }
});

test("should handle __jsxComponent returning an array", () => {
    const MultiComponent = () => ["<div>First</div>", "<div>Second</div>", "<div>Third</div>"];
    assertRenders(__jsxComponent(MultiComponent, []), "<div>First</div><div>Second</div><div>Third</div>");
});

test("should allow prop objects (non-array) for intrinsic element", () => {
    const result = __jsxComponent("nav", { role: "navigation", class: "main" }, "<span>Menu</span>");
    assertRenders(result, '<nav role="navigation" class="main"><span>Menu</span></nav>');
});

test("should throw when component is not function or string", () => {
    assert.throws(() => __jsxComponent(42, []), /expected a function or intrinsic tag string/i);
});

test("should merge component props in order and use the supplied children", () => {
    let receivedProps;
    const Component = (props) => {
        receivedProps = props;
        return `${props.value}:${props.children}`;
    };

    const result = __jsxComponent(
        Component,
        [{ value: "first", retained: true, children: "prop child" }, null, "ignored", { value: "last" }],
        "argument child",
    );

    assert.strictEqual(result, "last:argument child");
    assert.deepStrictEqual(receivedProps, { value: "last", retained: true, children: "argument child" });
});

test("component rendering variations", async (t) => {
    const cases = [
        { name: "no props", component: () => "<div>Basic Component</div>", props: [], expected: "<div>Basic Component</div>" },
        {
            name: "with props",
            component: (props) => `<div class="${props.class}">With Props</div>`,
            props: [{ class: "test-class" }],
            expected: '<div class="test-class">With Props</div>',
        },
        {
            name: "with children",
            component: ({ children }) => `<div>${children}</div>`,
            props: [],
            children: "<span>Child Content</span>",
            expected: "<div><span>Child Content</span></div>",
        },
        {
            name: "with props and children",
            component: ({ children, ...props }) => `<div id="${props.id}">${children}</div>`,
            props: [{ id: "test" }],
            children: "<span>Child Content</span>",
            expected: '<div id="test"><span>Child Content</span></div>',
        },
        {
            name: "intrinsic element with attributes and children",
            component: "section",
            props: [{ id: "intro", class: "hero" }],
            children: "<p>Hello</p>",
            expected: '<section id="intro" class="hero"><p>Hello</p></section>',
        },
        { name: "intrinsic element with no children", component: "div", props: [{ class: "wrap" }], expected: '<div class="wrap"></div>' },
    ];

    for (const tc of cases) {
        await t.test(tc.name, () => assertRenders(__jsxComponent(tc.component, tc.props, tc.children), tc.expected));
    }
});

test("void elements ignore children", async (t) => {
    const cases = [
        {
            name: "img",
            element: "img",
            props: [{ src: "/logo.png", alt: "Logo" }],
            children: "IGNORED",
            expected: '<img src="/logo.png" alt="Logo"/>',
        },
        {
            name: "input",
            element: "input",
            props: [{ type: "text", placeholder: "Enter text" }],
            children: "IGNORED",
            expected: '<input type="text" placeholder="Enter text"/>',
        },
    ];

    for (const tc of cases) {
        await t.test(tc.name, () => assertRenders(__jsxComponent(tc.element, tc.props, tc.children), tc.expected));
    }
});

test("attribute edge cases", async (t) => {
    const cases = [
        { name: "empty object", props: {}, expected: "" },
        { name: "boolean true", props: { visible: true, hidden: false }, expected: " visible" },
        { name: "null and false omitted", props: { hidden: false, empty: null }, expected: "" },
        { name: "zero as string", props: { zero: 0 }, expected: ' zero="0"' },
        { name: "className converts to class", props: { className: "test" }, expected: ' class="test"' },
        { name: "htmlFor converts to for", props: { htmlFor: "input" }, expected: ' for="input"' },
        { name: "onClick converts to onclick", props: { onClick: "handleClick" }, expected: ' onclick="handleClick"' },
        {
            name: "onDoubleClick converts to ondblclick",
            props: { onDoubleClick: "handleDblClick" },
            expected: ' ondblclick="handleDblClick"',
        },
        {
            name: "aria attributes with hyphens",
            props: { ariaLabel: "test-label", ariaRequired: true, ariaHidden: false },
            expected: ' aria-label="test-label" aria-required',
        },
        {
            name: "regular attributes",
            props: { src: "image.jpg", href: "/link", type: "button", value: "test" },
            expected: ' src="image.jpg" href="/link" type="button" value="test"',
        },
    ];

    for (const tc of cases) {
        await t.test(tc.name, () => assertRenders(__jsxSpread(tc.props), tc.expected));
    }
});
