/**
 * @fileoverview Tests for JSX syntax highlighter utility
 *
 * @module utils/highlight-jsx.test
 * @description
 * Unit tests for the highlightJsx function to ensure correct syntax highlighting
 * of JSX code with proper class assignments for tags, attributes, strings, and expressions.
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import { highlightJsx } from "./highlight-jsx.js";

describe("highlightJsx", () => {
    it("should highlight basic JSX tag", () => {
        const input = "<div></div>";
        const expected =
            '<span class="jsx-tag">&lt;<span class="jsx-name">div</span>&gt;</span><span class="jsx-tag">&lt;/<span class="jsx-name">div</span>&gt;</span>';
        assert.strictEqual(highlightJsx(input), expected);
    });

    it("should highlight JSX tag with attribute", () => {
        const input = '<div className="test"></div>';
        const expected =
            '<span class="jsx-tag">&lt;<span class="jsx-name">div</span> <span class="jsx-attribute">className</span>=<span class="jsx-string">&quot;test&quot;</span>&gt;</span><span class="jsx-tag">&lt;/<span class="jsx-name">div</span>&gt;</span>';
        assert.strictEqual(highlightJsx(input), expected);
    });

    it("should highlight JSX tag with multiple attributes", () => {
        const input = '<Avatar src="url" alt="desc" size="lg" />';
        const expected =
            '<span class="jsx-tag">&lt;<span class="jsx-name">Avatar</span> <span class="jsx-attribute">src</span>=<span class="jsx-string">&quot;url&quot;</span> <span class="jsx-attribute">alt</span>=<span class="jsx-string">&quot;desc&quot;</span> <span class="jsx-attribute">size</span>=<span class="jsx-string">&quot;lg&quot;</span> /&gt;</span>';
        assert.strictEqual(highlightJsx(input), expected);
    });

    it("should highlight JSX expression in attribute", () => {
        const input = '<div className={cn("test")}></div>';
        const expected =
            '<span class="jsx-tag">&lt;<span class="jsx-name">div</span> <span class="jsx-attribute">className</span>=<span class="jsx-expression">{cn(&quot;test&quot;)}</span>&gt;</span><span class="jsx-tag">&lt;/<span class="jsx-name">div</span>&gt;</span>';
        assert.strictEqual(highlightJsx(input), expected);
    });

    it("should highlight self-closing tag", () => {
        const input = '<input type="text" />';
        const expected =
            '<span class="jsx-tag">&lt;<span class="jsx-name">input</span> <span class="jsx-attribute">type</span>=<span class="jsx-string">&quot;text&quot;</span> /&gt;</span>';
        assert.strictEqual(highlightJsx(input), expected);
    });

    it("should highlight JSX with text content", () => {
        const input = "<div>Hello World</div>";
        const expected =
            '<span class="jsx-tag">&lt;<span class="jsx-name">div</span>&gt;</span>Hello World<span class="jsx-tag">&lt;/<span class="jsx-name">div</span>&gt;</span>';
        assert.strictEqual(highlightJsx(input), expected);
    });

    it("should highlight JSX expression in content", () => {
        const input = "<div>{name}</div>";
        const expected =
            '<span class="jsx-tag">&lt;<span class="jsx-name">div</span>&gt;</span><span class="jsx-expression">{name}</span><span class="jsx-tag">&lt;/<span class="jsx-name">div</span>&gt;</span>';
        assert.strictEqual(highlightJsx(input), expected);
    });

    it("should handle empty input", () => {
        assert.strictEqual(highlightJsx(""), "");
    });

    it("should highlight complex nested JSX", () => {
        const input = '<div class="container"><h1>{title}</h1><p>{"Text"}</p></div>';
        const expected =
            '<span class="jsx-tag">&lt;<span class="jsx-name">div</span> <span class="jsx-attribute">class</span>=<span class="jsx-string">&quot;container&quot;</span>&gt;</span><span class="jsx-tag">&lt;<span class="jsx-name">h1</span>&gt;</span><span class="jsx-expression">{title}</span><span class="jsx-tag">&lt;/<span class="jsx-name">h1</span>&gt;</span><span class="jsx-tag">&lt;<span class="jsx-name">p</span>&gt;</span><span class="jsx-expression">{&quot;Text&quot;}</span><span class="jsx-tag">&lt;/<span class="jsx-name">p</span>&gt;</span><span class="jsx-tag">&lt;/<span class="jsx-name">div</span>&gt;</span>';
        assert.strictEqual(highlightJsx(input), expected);
    });

    it("should handle strings with special characters", () => {
        const input = '<div title="Say & hello"></div>';
        const expected =
            '<span class="jsx-tag">&lt;<span class="jsx-name">div</span> <span class="jsx-attribute">title</span>=<span class="jsx-string">&quot;Say &amp; hello&quot;</span>&gt;</span><span class="jsx-tag">&lt;/<span class="jsx-name">div</span>&gt;</span>';
        assert.strictEqual(highlightJsx(input), expected);
    });

    it("should handle nested expressions", () => {
        const input = "<div>{items.map(item => <span>{item}</span>)}</div>";
        const expected =
            '<span class="jsx-tag">&lt;<span class="jsx-name">div</span>&gt;</span><span class="jsx-expression">{items.map(item =&gt; &lt;span&gt;{item}&lt;/span&gt;)}</span><span class="jsx-tag">&lt;/<span class="jsx-name">div</span>&gt;</span>';
        assert.strictEqual(highlightJsx(input), expected);
    });
});
