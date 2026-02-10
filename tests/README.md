# Test Documentation

This document describes testing patterns, consolidation strategies, and guidelines used in the SXO project, particularly from Track 005 (Test Optimization).

## Table of Contents

- [Test Patterns](#test-patterns)
- [Consolidation Guidelines](#consolidation-guidelines)
- [Track 005 Consolidations](#track-005-consolidations)
- [Issue Mapping](#issue-mapping)
- [References](#references)

---

## Test Patterns

### AAA Pattern (Arrange-Act-Assert)

Structure tests using the AAA pattern for clarity and maintainability:

1. **Arrange**: Set up all necessary conditions (mocks, fixtures, data)
2. **Act**: Execute the function/method being tested (typically one line)
3. **Assert**: Verify the outcome matches expectations

**Example** (from `src/js/server/dev/core-handler.test.js`):
```javascript
it("should create handler without throwing", () => {
    // Arrange
    const config = {
        getRoutes: mockGetRoutes,
        loadJsxModule: mockLoadJsxModule,
        publicPath: "/",
        // ... other config
    };

    // Act
    const handler = createDevHandler(config);

    // Assert
    deepStrictEqual(typeof handler, "function");
});
```

### Descriptive Test Names

Use the three-part structure for test names:

1. **What is being tested?** (The unit under test)
2. **Under what circumstances?** (The specific scenario)
3. **What is the expected result?** (The outcome)

**Examples**:
- ✅ `should include security headers on SSR response`
- ✅ `should throw error when getRoutes is missing`
- ✅ `should return 404 when file not found`

❌ Avoid:
- ❌ `add product` (too vague)
- ❌ `test headers` (insufficient context)

### Parameterized Tests

For functions that need to be tested with multiple inputs, use data-driven (table-driven) tests. This makes tests concise and easy to extend.

**Pattern**:
```javascript
test("handles various route patterns", (t) => {
    const patterns = [
        {
            name: "static pattern with no parameters",
            pattern: "about",
            expectedParamNames: [],
            validMatches: ["about"],
            invalidMatches: ["about/extra"],
        },
        {
            name: "single parameter pattern",
            pattern: "blog/[slug]",
            expectedParamNames: ["slug"],
            validMatches: ["blog/hello-world"],
            invalidMatches: ["blog"],
        },
        // ... more cases
    ];

    for (const { name, pattern, expectedParamNames, validMatches, invalidMatches } of patterns) {
        t.test(name, (_t) => {
            const result = buildPatternRegex(pattern);
            assert.ok(result.regex instanceof RegExp, "should return a RegExp");
            assert.deepStrictEqual(result.paramNames, expectedParamNames);
            // ... assertions
        });
    }
});
```

**When to use**:
- Multiple inputs test the same behavior
- Function is purely functional (no side effects)
- Test cases share identical assertions structure

**Example file**: `src/js/server/utils/route-match.test.js`

### Test Organization

Use at least two levels of `describe` blocks for categorization:

```javascript
describe("module-name", () => {
    describe("When [scenario]", () => {
        test("should [expected behavior]", () => {
            // test implementation
        });
    });
});
```

**Example hierarchy**:
```javascript
describe("createDevHandler", () => {
    describe("When config is valid", () => {
        test("should create handler without throwing", () => {});
        test("should use default middleware getter when not provided", () => {});
    });

    describe("When config is invalid", () => {
        test("should throw error when getRoutes is missing", () => {});
    });
});
```

---

## Consolidation Guidelines

### When to Consolidate

**Consolidate tests when**:

1. **Purely functional behavior**: Multiple tests check the same function with different inputs
2. **Identical assertion structure**: Test cases share the same setup/arrange and assert phases
3. **No behavioral differences**: Tests verify input/output mapping, not edge cases or error handling
4. **Clear parameter mapping**: Test cases can be expressed as an array of objects with `{name, input, expected}`

**Example**: `src/js/esbuild/jsx-helpers.test.js` consolidates tests 4, 5, 6, 7, 19, 21:
```javascript
test("component rendering variations", async (t) => {
    const cases = [
        { name: "component with no props", component: () => "<div>Basic</div>", ... },
        { name: "component with props", component: (props) => ..., ... },
        { name: "component with children", ... },
        // ... more cases
    ];

    for (const testCase of cases) {
        await t.test(`component rendering: ${testCase.name}`, () => {
            const result = __jsxComponent(testCase.component, testCase.props, testCase.children);
            assert.strictEqual(result.toString(), testCase.expected);
        });
    }
});
```

### When to Keep Explicit

**Do NOT consolidate tests when**:

1. **Security-critical behavior**: Tests for input validation, path traversal, XSS protection
2. **Error path testing**: Each error scenario should have its own descriptive test
3. **Complex setup**: When test cases require significantly different arrange phases
4. **Behavioral documentation**: Tests serve as examples for future developers
5. **Edge case handling**: Unique error conditions that need specific assertions

**Security tests MUST remain explicit**. See [Security Test Guidelines](#security-test-guidelines).

### Maintaining Readability

After consolidation, ensure tests remain readable:

1. **Descriptive parameter names**: Use `{name, pattern, expected, actual}` over `{a, b, c}`
2. **Clear subtest names**: Each subtest should be self-documenting
3. **Logical grouping**: Keep related cases together in the cases array
4. **Comments for intent**: Add inline comments explaining non-obvious consolidation rationale
5. **Limit case count**: If cases array grows beyond 10-15, consider splitting into separate parameterized tests

**Good example**:
```javascript
test("void elements ignore children", async (t) => {
    const cases = [
        {
            name: "img void element ignores children",
            element: "img",
            props: [{ src: "/logo.png", alt: "Logo" }],
            children: "IGNORED",
            expected: '<img src="/logo.png" alt="Logo"/>',
        },
        // ... more cases
    ];

    for (const testCase of cases) {
        await t.test(`void elements ignore children: ${testCase.name}`, () => {
            const result = __jsxComponent(testCase.element, testCase.props, testCase.children);
            assert.strictEqual(result.toString(), testCase.expected);
        });
    }
});
```

### Ensuring Coverage is Maintained

After consolidation:

1. **Run coverage**: `pnpm run test:coverage`
2. **Verify line coverage**: No drop in line coverage percentage
3. **Check branch coverage**: All conditional paths still tested
4. **Review mutation testing**: If available, ensure mutants are still killed
5. **Test each path**: Manually verify each case still executes expected code paths

**Track 005 result**: Final coverage after consolidation:
- **Line coverage**: 95.53% (maintained)
- **Branch coverage**: 86.61% (maintained)
- **Function coverage**: 89.20% (maintained)

---

## Security Test Guidelines

**CRITICAL**: Security tests MUST remain explicit. Never consolidate security tests into parameterized tests.

### Security Tests Must Be Explicit

Security tests serve as **contract documentation** and **regression prevention**. Each test should:

1. **Document the vulnerability**: Explain what attack vector is being prevented
2. **Test the fix explicitly**: Verify the specific mitigation works
3. **Include failure context**: Show what would happen without the fix
4. **Be independently verifiable**: Each test should run in isolation

**Example** (from `src/js/server/prod/core-handler-security.test.js`):
```javascript
it("should include security headers on 404 response", async () => {
    const handler = createProdHandler(config);
    const request = new Request("http://localhost:3000/nonexistent");

    const result = await handler.handleRequest(config);
    assert.equal(result.type, "response");
    const response = result.response;
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff", "Missing X-Content-Type-Options header on 404");
    assert.equal(response.headers.get("X-Frame-Options"), "DENY", "Missing X-Frame-Options header on 404");
});
```

### Security Test Categories

From Track 005, these security tests were **explicitly maintained** (0% consolidation):

| Issue | File | Tests | Description |
|-------|------|-------|-------------|
| #1 | `server/dev/node.test.js` | Dev server crash bug | Tests that file extension detection works correctly |
| #2 | `cli/commands/add.test.js` | Path traversal vulnerability | Tests that component name validation prevents `../` attacks |
| #5 | `server/dev/node.test.js` | Middleware crash on import error | Tests that middleware load failures are handled gracefully |
| #10 | `server/prod/core-handler-security.test.js` | Security headers | Tests that X-Content-Type-Options, X-Frame-Options, Referrer-Policy are present on all responses |

**See**: [Issue Mapping](#issue-mapping) for detailed references to CODE_REVIEW.md

### Security Test Naming

Security test names should explicitly state the vulnerability being prevented:

✅ **Good**:
- `should prevent path traversal attacks in component names`
- `should not crash on file extension detection`
- `should include security headers on all response types`

❌ **Avoid**:
- `handles security` (too vague)
- `validates input` (doesn't specify threat)
- `error handling` (doesn't indicate security context)

---

## Track 005 Consolidations

### Files Consolidated

During Track 005, the following test files were consolidated using parameterized tests:

| File | Consolidations | Tests Affected | Coverage Impact |
|------|----------------|-----------------|-----------------|
| `src/js/esbuild/jsx-helpers.test.js` | Tests 4, 5, 6, 7, 19, 21 → 1 parameterized test | 6 → 1 | 0% (maintained) |
| `src/js/esbuild/jsx-helpers.test.js` | Tests 10, 13, 14, 16, 17 → 1 parameterized test | 5 → 1 | 0% (maintained) |
| `src/js/server/utils/route-match.test.js` | 8 route patterns → 1 parameterized test | 8 → 1 | 0% (maintained) |

### Consolidation Strategies Used

1. **Parameter name clarity**: Use descriptive names like `{name, pattern, expectedParamNames, validMatches, invalidMatches}`
2. **Subtest organization**: Each case becomes a named subtest for clear failure reporting
3. **Preserve assertion details**: Maintain assertion messages even after consolidation
4. **Document rationale**: Add comments explaining consolidation (e.g., `// Consolidates tests 4, 5, 6, 7, 19, 21`)

### Coverage Maintained

- **Line coverage**: 95.53% (no regression)
- **Branch coverage**: 86.61% (no regression)
- **Function coverage**: 89.20% (no regression)
- **All tests passing**: 1248/1248
- **Security tests**: 0% consolidated (explicitly maintained)

### What Was NOT Consolidated

The following categories were explicitly excluded from consolidation:

1. **Security tests**: All tests addressing CODE_REVIEW.md issues #1, #2, #5, #10
2. **Error path tests**: Tests for edge cases and error handling (issues #7, #8, #9, #11)
3. **Integration tests**: Tests involving multiple components or middleware interaction
4. **Behavioral documentation**: Tests serving as examples for API usage

---

## Issue Mapping

This section maps test files to specific issues from [CODE_REVIEW.md](.conductor/tracks/track-005-test-reduction/CODE_REVIEW.md).

### Security Tests (Issues #1, #2, #5, #10)

| Issue | Severity | Description | Test File | Test Coverage |
|-------|-----------|-------------|------------|----------------|
| #1 | 🔴 Critical | Dev server crashes on any request with a file extension | `server/dev/node.test.js` | Tests file extension detection regex, static asset handling |
| #2 | 🔴 Critical | Arbitrary file write + local file read via path traversal in `sxo add` | `cli/commands/add.test.js` | Tests component name validation prevents `../` attacks |
| #5 | 🟠 High | Dev server startup can crash on middleware import without recovery | `server/dev/node.test.js` | Tests middleware import is wrapped in try/catch |
| #10 | 🟡 Medium | Symlink escape not fully prevented for `pagesDir` / `componentsDir` | `config/validate-config.test.js` | Tests path validation prevents symlink traversal |

### Error Path Tests (Issues #7, #8, #9, #11)

| Issue | Severity | Description | Test File | Test Coverage |
|-------|-----------|-------------|------------|----------------|
| #7 | 🟡 Medium | Possible dev hot-reload "no filename" edge case = rebuild never triggered | `server/dev/node.test.js` | Tests file watcher handles null filename |
| #8 | 🟡 Medium | Dev startup reload runs even when build has errors; can cascade failures | `server/dev/core.test.js` | Tests esbuild errors prevent invalid reload |
| #9 | 🟡 Medium | `runEsbuild()` swallows execution failures and returns "no errors" | `server/dev/core.test.js` | Tests esbuild failures are properly propagated |
| #11 | 🟢 Low | Multiple silent catch blocks hide useful diagnostics | Various test files | Tests error logging and diagnostics are preserved |

### Additional Coverage

| Issue Category | Test Files | Notes |
|---------------|--------------|--------|
| Security headers (all response types) | `server/prod/core-handler-security.test.js` | Explicitly maintained (0% consolidation) |
| Route pattern validation | `server/utils/route-match.test.js` | Parameterized for pattern variations |
| JSX helper functions | `esbuild/jsx-helpers.test.js` | Consolidated for input variations |
| Dev server handlers | `server/dev/core-handler.test.js`, `server/dev/handlers/hot-reload-handler.test.js` | Explicit tests for error paths and edge cases |

---

## References

### Internal Documentation

- **[.rules/testing.instructions.md](.rules/testing.instructions.md)**: Comprehensive testing guidelines for Node.js applications
- **[AGENTS.md](AGENTS.md)**: Section 15 (Testing Strategy), Section 22 (Testing Workflow)
- **[.conductor/tracks/track-005-test-reduction/CODE_REVIEW.md](.conductor/tracks/track-005-test-reduction/CODE_REVIEW.md)**: Detailed code review with issue classifications

### Testing Best Practices

- **Use `node:test` built-in runner**: No external frameworks (Jest, Mocha, etc.)
- **Use `node:assert/strict`**: Strict equality checks (`strictEqual`, `deepStrictEqual`)
- **Black-box testing**: Test public interfaces, not implementation details
- **Descriptive naming**: Three-part structure (what, when, expected)
- **AAA pattern**: Arrange-Act-Assert for clear test flow
- **Avoid over-mocking**: Test real integrations where practical
- **Test quality over coverage**: Write tests that document expected behavior, not just hit lines

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm run test:coverage

# Run specific test file
pnpm test src/js/server/utils/route-match.test.js

# Lint tests
npm run check
```

### Coverage Standards

Track 005 established these coverage baselines:

- **Line coverage**: 95.53% (excellent)
- **Branch coverage**: 86.61% (good)
- **Function coverage**: 89.20% (excellent)
- **All runtimes verified**: Node.js, Bun, Cloudflare Workers

Target for future work: Maintain >95% line coverage across all modules.
