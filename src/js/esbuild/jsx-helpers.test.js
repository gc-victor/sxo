import assert from "node:assert/strict";
import { test } from "node:test";
import "./jsx-helpers.js";

test("should handle basic static template", () => {
    const result = __jsxList("<div>Hello</div>");
    assert.strictEqual(result.toString(), "<div>Hello</div>");
});

test("should handle template with dynamic values", () => {
    const dynamicClass = "active";
    const result = __jsxList(`<div class="${dynamicClass}">Content</div>`);
    assert.strictEqual(result.toString(), '<div class="active">Content</div>');
});

test("should handle nested elements with dynamic content", () => {
    const items = ["one", "two"];
    const result = `<div class="test"><ul>${__jsxList(items.map((item) => `<li>${item}</li>`))}</ul></div>`;
    assert.strictEqual(result.toString(), '<div class="test"><ul><li>one</li><li>two</li></ul></div>');
});

test("should handle component with no props", () => {
    const Component = () => "<div>Basic Component</div>";
    const result = __jsxComponent(Component, []);
    assert.strictEqual(result.toString(), "<div>Basic Component</div>");
});

test("should handle component with props", () => {
    const Component = (props) => `<div class="${props.class}">With Props</div>`;
    const result = __jsxComponent(Component, [{ class: "test-class" }]);
    assert.strictEqual(result.toString(), '<div class="test-class">With Props</div>');
});

test("should handle component with children", () => {
    const Component = ({ children }) => `<div>${children}</div>`;
    const result = __jsxComponent(Component, [], "<span>Child Content</span>");
    assert.strictEqual(result.toString(), "<div><span>Child Content</span></div>");
});

test("should handle component with props and children", () => {
    const Component = ({ children, ...props }) => `<div id="${props.id}">${children}</div>`;
    const result = __jsxComponent(Component, [{ id: "test" }], "<span>Child Content</span>");
    assert.strictEqual(result.toString(), '<div id="test"><span>Child Content</span></div>');
});

test("should handle nested component composition", () => {
    const Child = ({ children, ...props }) => `<div><p>${props.attr}</p>${children}</div>`;
    const Parent = (props) => __jsxComponent(Child, [props], "<p>Parent Content</p><p>Another Content</p>");
    const GrandParent = () => __jsxComponent(Parent, [{ attr: "Test" }]);
    const result = __jsxComponent(GrandParent, []);
    assert.strictEqual(result.toString(), "<div><p>Test</p><p>Parent Content</p><p>Another Content</p></div>");
});

test("should spread object properties into string", () => {
    const props = { class: "test", id: "main", disabled: true };
    const result = __jsxSpread(props);
    assert.strictEqual(result.toString(), ' class="test" id="main" disabled');
});

test("should handle empty object", () => {
    const props = {};
    const result = __jsxSpread(props);
    assert.strictEqual(result.toString(), "");
});

test("should handle boolean and null values", () => {
    const props = {
        visible: true,
        hidden: false,
        empty: null,
        zero: 0,
    };
    const result = __jsxSpread(props);
    assert.strictEqual(result.toString(), ' visible zero="0"');
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
                <nav>${__jsxList(
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

test("should handle specific JSX attribute name conversions", () => {
    // Convert className to class
    const classProps = { className: "test" };
    assert.strictEqual(__jsxSpread(classProps), ' class="test"');
    // Convert htmlFor to for
    const forProps = { htmlFor: "input" };
    assert.strictEqual(__jsxSpread(forProps), ' for="input"');
});

test("should handle event handler attribute names", () => {
    // Regular event handler
    const clickProps = { onClick: "handleClick" };
    assert.strictEqual(__jsxSpread(clickProps), ' onclick="handleClick"');
    // Special case for doubleclick
    const dblClickProps = { onDoubleClick: "handleDblClick" };
    assert.strictEqual(__jsxSpread(dblClickProps), ' ondblclick="handleDblClick"');
    // Animation events
    const animProps = { onAnimationEnd: "handleAnimEnd" };
    assert.strictEqual(__jsxSpread(animProps), ' onanimationend="handleAnimEnd"');
    const transProps = { onTransitionEnd: "handleTransEnd" };
    assert.strictEqual(__jsxSpread(transProps), ' ontransitionend="handleTransEnd"');
    // Touch events
    const touchProps = { onTouchStart: "handleTouch" };
    assert.strictEqual(__jsxSpread(touchProps), ' ontouchstart="handleTouch"');
    // Other special cases
    const inputProps = { onBeforeInput: "handleInput" };
    assert.strictEqual(__jsxSpread(inputProps), ' onbeforeinput="handleInput"');
    const compProps = { onCompositionEnd: "handleComp" };
    assert.strictEqual(__jsxSpread(compProps), ' oncompositionend="handleComp"');
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

test("should handle aria attributes", () => {
    const ariaProps = {
        ariaLabel: "test-label",
        ariaRequired: true,
        ariaHidden: false,
        ariaDisabled: null,
    };
    assert.strictEqual(__jsxSpread(ariaProps), ' aria-label="test-label" aria-required');
});

test("should preserve regular attribute names", () => {
    // Regular attributes should remain unchanged
    const standardProps = {
        src: "image.jpg",
        href: "/link",
        type: "button",
        value: "test",
    };
    assert.strictEqual(__jsxSpread(standardProps), ' src="image.jpg" href="/link" type="button" value="test"');

    // Non-matching camelCase should remain unchanged
    const customProps = {
        dataTest: "value",
    };
    assert.strictEqual(__jsxSpread(customProps), ' dataTest="value"');
});

test("should handle __jsxComponent returning an array", () => {
    const MultiComponent = () => ["<div>First</div>", "<div>Second</div>", "<div>Third</div>"];
    const result = __jsxComponent(MultiComponent, []);
    assert.strictEqual(result.toString(), "<div>First</div><div>Second</div><div>Third</div>");
});

/* New intrinsic element support tests */

test("should render intrinsic string element with attributes and children", () => {
    const result = __jsxComponent("section", [{ id: "intro", class: "hero" }], "<p>Hello</p>");
    assert.strictEqual(result.toString(), '<section id="intro" class="hero"><p>Hello</p></section>');
});

test("should render intrinsic void element and ignore children", () => {
    const result = __jsxComponent("img", [{ src: "/logo.png", alt: "Logo" }], "IGNORED");
    assert.strictEqual(result.toString(), '<img src="/logo.png" alt="Logo"/>');
});

test("should render intrinsic element with no children producing empty content", () => {
    const result = __jsxComponent("div", [{ class: "wrap" }]);
    assert.strictEqual(result.toString(), '<div class="wrap"></div>');
});

test("should allow prop objects (non-array) for intrinsic element", () => {
    const result = __jsxComponent("nav", { role: "navigation", class: "main" }, "<span>Menu</span>");
    assert.strictEqual(result.toString(), '<nav role="navigation" class="main"><span>Menu</span></nav>');
});

test("should throw when component is not function or string", () => {
    let threw = false;
    try {
        __jsxComponent(42, []);
    } catch (e) {
        threw = true;
        assert.match(String(e), /expected a function or intrinsic tag string/i);
    }
    assert.ok(threw, "Expected __jsxComponent to throw for invalid component type");
});
