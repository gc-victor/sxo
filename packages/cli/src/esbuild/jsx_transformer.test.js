import assert from "node:assert/strict";
import { test } from "node:test";

// Import WASM-powered JSX transformer (same path plugin uses)
import { jsx } from "../../jsx-transformer/jsx_transformer.js";

// Helper to make whitespace-insensitive comparisons where appropriate
function normalizeWs(s) {
    return s.replace(/\s+/g, " ").trim();
}

// === Basic JSX Transformations ===
test("transform: basic JSX element", () => {
    const source = "const el = <div>Hello</div>;";
    const result = jsx(source);
    assert.equal(result, "const el = `<div>Hello</div>`;");
});

// === Dynamic Content & Array Methods ===
test("transform: .map of JSX children uses __jsxList", () => {
    const source = "const el = <div>{items.map(item => <li>{item}</li>)}</div>;";
    const result = jsx(source);
    assert.equal(result, `const el = \`<div>\${__jsxList(items.map(item => \`<li>\${item}</li>\`))}</div>\`;`);
});

// === Complex Nesting & Expressions ===
test("transform: nested components with attributes and children", () => {
    const source =
        'const el = <ParentComponent attr="val"  moto><ChildComponent {...spread}><div>Inner content</div></ChildComponent></ParentComponent>;';
    const result = jsx(source);
    const expected = `const el = \`\${__jsxComponent(ParentComponent, [{"attr":"val"},{"moto":true}], \`\${__jsxComponent(ChildComponent, [{...spread}], \`<div>Inner content</div>\`)}\`)}\`;`;
    assert.equal(result, expected);
});

// === Content Preservation ===
test("transform: <pre><code>{`...`}</code></pre> preserves the template literal content", () => {
    const source =
        'const el = <pre className="bg-secondary/30 p-4 text-sm font-mono overflow-x-auto">\n' +
        '            <code className="text-foreground">\n' +
        "            {`# Standard Node.js deployment\n" +
        " sxo build\n" +
        " sxo start --port 3000\n\n" +
        " # Docker deployment\n" +
        " FROM node:20-alpine\n" +
        " WORKDIR /app\n" +
        " COPY . .\n" +
        " RUN npm ci && npx sxo build\n" +
        ' CMD ["npx", "sxo", "start"]`}\n' +
        "            </code>\n" +
        "        </pre>;";
    const result = jsx(source);
    // Sanity checks for structure and content
    assert.ok(result.includes('<pre class="bg-secondary/30 p-4 text-sm font-mono overflow-x-auto">'), "should preserve pre attributes");
    assert.ok(result.includes('<code class="text-foreground">'), "should preserve code attributes");
    assert.ok(result.includes("Standard Node.js deployment"), "should include template content");
    assert.ok(result.includes("Docker deployment"), "should include template content");
    assert.ok(result.includes('CMD ["npx", "sxo", "start"]'), "should include template content");
});

// === Comment & Entity Handling ===
test("transform: JSX comments are removed, regular block/single-line comments remain", () => {
    const source = `/* Block comment at start */
function test() {
    /* Inline block comment */
    const value = "test";
    /** JSDoc style comment */
    return (
        <div>
            {/* JSX comment */}
            <span>content</span>
            {/* Another JSX comment */}
        </div>
    );
}`;
    const result = jsx(source);
    // JSX comments should be gone
    assert.ok(!result.includes("JSX comment"));
    // Regular comments remain
    assert.ok(result.includes("Block comment at start"));
    assert.ok(result.includes("Inline block comment"));
    assert.ok(result.includes("JSDoc style comment"));
    // JSX content should be present
    assert.ok(result.includes("<span>content</span>"));
});

// === Component Integration ===
test("transform: component children composition", () => {
    const source = `
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
const result = <GrandParent />;`;
    const out = jsx(source);
    const expected = `
const Child = ({ children, ...props }) => \`<div><p>\${ props.attr }</p>\${children}</div>\`;
const Parent = (props) => ( \`\${__jsxComponent(Child, [{...props}], \`<p>Parent Content</p><p>Another Content</p>\`)}\` );
const GrandParent = () => ( \`\${__jsxComponent(Parent, [{"attr":"Test"}], \`<p>GrandParent Content</p>\`)}\` );
const result = \`\${__jsxComponent(GrandParent, [])}\`;`;
    assert.equal(normalizeWs(out), normalizeWs(expected));
});

// === Scanner Edge Cases ===
test("scanner: ignores '<' in single-line comments", () => {
    const src = "// <div> not jsx\nlet x = 1; const el = <span/>;";
    const out = jsx(src);
    // JSX inside comment is not transformed; following JSX is transformed
    assert.ok(out.includes("// <div> not jsx"));
    assert.ok(out.includes("<span></span>"));
});

// === Diagnostics ===
test("diagnostics: aggregated parse errors contain caret-aligned output", () => {
    const src = '<div>\n<span>ok</div>\n<div class="oops>Bad</div>';
    let caught;
    try {
        jsx(src);
    } catch (e) {
        caught = e;
    }
    assert.ok(caught, "expected transformer to throw");
    const s = String(caught);
    // Error string is meaningful; assert key components are present
    assert.ok(s.includes("  --> "));
    assert.ok(/:\d+:\d+/.test(s));
    assert.ok(s.includes("^"), "expected caret in diagnostics");
});
