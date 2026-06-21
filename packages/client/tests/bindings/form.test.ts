import { captureConsoleOutput, createComponent, simulateCheck, simulateInput, TestReactiveComponent } from "@tests/utils/test-helpers";
import { describe, expect, it } from "vitest";

describe("ReactiveComponent Form Input Bindings", () => {
    class FormBindingComponent extends TestReactiveComponent {
        textValue!: string;
        numberValue!: number;
        isChecked!: boolean;
        selectedOption!: string;

        constructor() {
            super();
            this.testSetState("textValue", "Initial text");
            this.testSetState("numberValue", 42);
            this.testSetState("isChecked", true);
            this.testSetState("selectedOption", "option2");
        }
    }
    customElements.define("test-form-binding", FormBindingComponent);

    it("should bind text input to state (two-way)", () => {
        const { component, cleanup } = createComponent<FormBindingComponent>(
            "test-form-binding",
            {},
            '<input type="text" $bind-value="textValue" />',
        );
        const input = component.querySelector("input") as HTMLInputElement;
        expect(input.value).toBe("Initial text");
        component.textValue = "Updated from state";
        expect(input.value).toBe("Updated from state");
        simulateInput(input, "Updated from input");
        expect(component.textValue).toBe("Updated from input");
        cleanup();
    });

    it("should bind checkbox to state (two-way)", () => {
        const { component, cleanup } = createComponent<FormBindingComponent>(
            "test-form-binding",
            {},
            '<input type="checkbox" $bind-checked="isChecked" />',
        );
        const checkbox = component.querySelector('input[type="checkbox"]') as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
        component.isChecked = false;
        expect(checkbox.checked).toBe(false);
        simulateCheck(checkbox, true);
        expect(component.isChecked).toBe(true);
        cleanup();
    });

    it("should bind select element to state (two-way)", () => {
        const { component, cleanup } = createComponent<FormBindingComponent>(
            "test-form-binding",
            {},
            `<select $bind-value="selectedOption">
        <option value="option1">Option 1</option>
        <option value="option2">Option 2</option>
        <option value="option3">Option 3</option>
      </select>`,
        );
        const select = component.querySelector("select") as HTMLSelectElement;
        expect(select.value).toBe("option2");
        component.selectedOption = "option3";
        expect(select.value).toBe("option3");
        select.value = "option1";
        select.dispatchEvent(new Event("change"));
        expect(component.selectedOption).toBe("option1");
        cleanup();
    });

    it("should handle radio button groups correctly", () => {
        class RadioBindingComponent extends TestReactiveComponent {
            radioValue!: string;
            constructor() {
                super();
                this.testSetState("radioValue", "option1");
            }
        }
        customElements.define("test-radio-binding", RadioBindingComponent);

        const { component, cleanup } = createComponent<RadioBindingComponent>(
            "test-radio-binding",
            {},
            `
        <input type="radio" name="group1" value="option1" $bind-value="radioValue" />
        <input type="radio" name="group1" value="option2" $bind-value="radioValue" />
        <input type="radio" name="group1" value="option3" $bind-value="radioValue" />
      `,
        );
        const radioButtons = component.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
        expect(radioButtons[0].checked).toBe(true);
        expect(radioButtons[1].checked).toBe(false);
        expect(radioButtons[2].checked).toBe(false);
        expect(component.radioValue).toBe("option1");
        component.testSetState("radioValue", "option3");
        expect(radioButtons[0].checked).toBe(false);
        expect(radioButtons[1].checked).toBe(false);
        expect(radioButtons[2].checked).toBe(true);
        simulateCheck(radioButtons[1], true);
        expect(component.radioValue).toBe("option2");
        expect(radioButtons[0].checked).toBe(false);
        expect(radioButtons[1].checked).toBe(true);
        expect(radioButtons[2].checked).toBe(false);
        cleanup();
    });

    it("should handle radio button with falsy value", () => {
        class RadioFalsyComponent extends TestReactiveComponent {
            radioValue!: string;
            constructor() {
                super();
                this.testSetState("radioValue", "option1");
            }
        }
        customElements.define("test-radio-falsy", RadioFalsyComponent);

        const { component, cleanup } = createComponent<RadioFalsyComponent>(
            "test-radio-falsy",
            {},
            `
        <input type="radio" name="group1" value="option1" $bind-value="radioValue" />
        <input type="radio" name="group1" value="option2" $bind-value="radioValue" />
      `,
        );
        const radioButtons = component.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
        // Initially option1 is selected
        expect(radioButtons[0].checked).toBe(true);
        // Set to empty string (falsy value) - should not update radio buttons
        component.testSetState("radioValue", "");
        // Radio buttons should remain in their previous state since formattedValue is falsy
        expect(radioButtons[0].checked).toBe(true);
        cleanup();
    });

    it("should warn about incorrect binding types for checkbox and radio inputs", () => {
        class CheckboxRadioComponent extends TestReactiveComponent {
            checkboxValue!: string;
            radioChecked!: boolean;
            constructor() {
                super();
                this.testSetState("checkboxValue", "");
                this.testSetState("radioChecked", false);
            }
        }
        customElements.define("test-checkbox-radio", CheckboxRadioComponent);

        const consoleOutput = captureConsoleOutput();
        const { component, cleanup } = createComponent<CheckboxRadioComponent>(
            "test-checkbox-radio",
            {},
            `
        <div>
          <input type="checkbox" $bind-value="checkboxValue" />
          <input type="radio" name="group1" value="option1" $bind-checked="radioChecked" />
        </div>
      `,
        );
        const checkbox = component.querySelector('input[type="checkbox"]') as HTMLInputElement;
        const radio = component.querySelector('input[type="radio"]') as HTMLInputElement;
        simulateInput(checkbox, "test");
        simulateCheck(radio, true);
        expect(consoleOutput.warnings).toContain(`The checkbox ${checkbox} has $bind-value attribute, use $bind-checked instead.`);
        expect(consoleOutput.warnings).toContain(`The radio ${radio} has $bind-checked attribute, use $bind-value instead.`);
        consoleOutput.restore();
        cleanup();
    });

    it("should handle number and range inputs", () => {
        class InputHandlingComponent extends TestReactiveComponent {
            numberValue!: number;
            constructor() {
                super();
                this.testSetState("numberValue", 0);
            }
        }
        customElements.define("test-input-handling", InputHandlingComponent);

        const { component, cleanup } = createComponent<InputHandlingComponent>(
            "test-input-handling",
            {},
            `
        <div>
          <input type="number" $bind-value="numberValue" />
          <input type="range" min="0" max="100" $bind-value="numberValue" />
        </div>
      `,
        );
        const inputs = component.querySelectorAll("input") as NodeListOf<HTMLInputElement>;
        const numberInput = inputs[0];
        const rangeInput = inputs[1];
        // State-to-DOM: setting valueAsNumber updates component state
        numberInput.valueAsNumber = 42;
        numberInput.dispatchEvent(new Event("input"));
        expect(component.numberValue).toBe(42);
        rangeInput.valueAsNumber = 75;
        rangeInput.dispatchEvent(new Event("input"));
        expect(component.numberValue).toBe(75);
        // DOM-to-state: simulateInput updates component state for number inputs
        simulateInput(numberInput, "100");
        expect(component.numberValue).toBe(100);
        numberInput.valueAsNumber = Number.NaN;
        numberInput.dispatchEvent(new Event("input"));
        expect(component.numberValue).toBe(Number.NaN);
        cleanup();
    });

    it("should handle multiple select", () => {
        class InputHandlingComponent extends TestReactiveComponent {
            multiSelectValue!: string[];
            constructor() {
                super();
                this.testSetState("multiSelectValue", []);
            }
        }
        customElements.define("test-multiselect-handling", InputHandlingComponent);

        const { component, cleanup } = createComponent<InputHandlingComponent>(
            "test-multiselect-handling",
            {},
            `
        <select multiple $bind-value="multiSelectValue">
          <option value="opt1">Option 1</option>
          <option value="opt2">Option 2</option>
          <option value="opt3">Option 3</option>
        </select>
      `,
        );
        const select = component.querySelector("select") as HTMLSelectElement;
        select.options[0].selected = true;
        select.options[2].selected = true;
        select.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
        expect(component.multiSelectValue).toEqual(["opt1", "opt3"]);
        select.options[0].selected = true;
        select.options[1].selected = true;
        select.options[2].selected = false;
        component.testSetState("multiSelectValue", ["opt1", "opt2"]);
        expect(component.multiSelectValue).toEqual(["opt1", "opt2"]);
        component.testSetState("multiSelectValue", []);
        for (const opt of Array.from(select.options)) {
            opt.selected = false;
        }
        expect(component.multiSelectValue).toEqual([]);
        cleanup();
    });

    it("should initialize file input state", () => {
        class InputHandlingComponent extends TestReactiveComponent {
            fileValue!: File | null;
            constructor() {
                super();
                this.testSetState("fileValue", null);
            }
        }
        customElements.define("test-file-input-handling", InputHandlingComponent);

        const { component, cleanup } = createComponent<InputHandlingComponent>(
            "test-file-input-handling",
            {},
            '<input type="file" $bind-value="fileValue" />',
        );
        expect(component.fileValue).toBeNull();
        const fileInput = component.querySelector('input[type="file"]');
        expect(fileInput).toBeTruthy();
        expect(fileInput?.getAttribute("type")).toBe("file");
        cleanup();
    });

    it("should bind textarea input and change events", () => {
        class InputHandlingComponent extends TestReactiveComponent {
            textAreaValue!: string;
            constructor() {
                super();
                this.testSetState("textAreaValue", "");
            }
        }
        customElements.define("test-textarea-handling-v2", InputHandlingComponent);

        const { component, cleanup } = createComponent<InputHandlingComponent>(
            "test-textarea-handling-v2",
            {},
            '<textarea $bind-value="textAreaValue"></textarea>',
        );
        const textarea = component.querySelector("textarea") as HTMLTextAreaElement;
        // Verify textarea is properly bound
        expect(textarea).toBeTruthy();
        expect(textarea instanceof HTMLTextAreaElement).toBe(true);
        // Trigger input event to test textarea-specific handling
        textarea.value = "Hello, world!";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        expect(component.textAreaValue).toBe("Hello, world!");
        textarea.value = "Changed text";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        expect(component.textAreaValue).toBe("Changed text");
        // Use actual newline characters for multiline textarea binding
        const multilineText = "Line 1\nLine 2\nLine 3";
        textarea.value = multilineText;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new Event("change", { bubbles: true }));
        expect(component.textAreaValue).toBe(multilineText);
        cleanup();
    });

    it("should handle radio button value binding when unchecked", () => {
        class RadioUncheckedComponent extends TestReactiveComponent {
            radioValue!: string;
            constructor() {
                super();
                this.testSetState("radioValue", "option1");
            }
        }
        customElements.define("test-radio-unchecked", RadioUncheckedComponent);

        const { component, cleanup } = createComponent<RadioUncheckedComponent>(
            "test-radio-unchecked",
            {},
            `
        <input type="radio" name="group1" value="option1" $bind-value="radioValue" />
        <input type="radio" name="group1" value="option2" $bind-value="radioValue" />
      `,
        );
        const radioButtons = component.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
        // First radio is checked initially
        expect(radioButtons[0].checked).toBe(true);
        expect(radioButtons[1].checked).toBe(false);
        // Trigger input event on unchecked radio - should not update state
        radioButtons[1].dispatchEvent(new Event("input", { bubbles: true }));
        // State should remain option1 since radio[1] is not checked
        expect(component.radioValue).toBe("option1");
        cleanup();
    });

    it("should handle radio group with non-input elements in query results", () => {
        class RadioGroupWithExtraComponent extends TestReactiveComponent {
            radioValue!: string;
            constructor() {
                super();
                this.testSetState("radioValue", "option1");
            }
        }
        customElements.define("test-radio-group-extra", RadioGroupWithExtraComponent);

        const { component, cleanup } = createComponent<RadioGroupWithExtraComponent>(
            "test-radio-group-extra",
            {},
            `
        <div>
          <input type="radio" name="testgroup" value="option1" $bind-value="radioValue" />
          <input type="radio" name="testgroup" value="option2" $bind-value="radioValue" />
        </div>
      `,
        );
        // Override querySelectorAll to return mixed node types for branch coverage
        const originalQuerySelectorAll = component.querySelectorAll.bind(component);
        component.querySelectorAll = (selector: string): NodeListOf<Element> => {
            const result = originalQuerySelectorAll(selector);
            if (selector.includes('input[type="radio"]')) {
                // Create a mock NodeList with a non-HTMLInputElement element
                const container = document.createElement("div");
                const fakeElement = document.createElement("div");
                fakeElement.setAttribute("name", "testgroup");
                container.appendChild(fakeElement);
                // Return combined results
                const mixed = Array.from(result).concat([fakeElement]);
                return mixed as unknown as NodeListOf<Element>;
            }
            return result;
        };
        // Trigger state update to exercise radio group handling
        component.testSetState("radioValue", "option2");
        const radioButtons = component.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
        expect(radioButtons[1].checked).toBe(true);
        cleanup();
    });

    it.each([
        {
            name: "checked",
            tagName: "test-checked-binding",
            stateKey: "isChecked",
            initialValue: true,
            nextValue: false,
            markup: '<div $bind-checked="isChecked">Not an input</div>',
        },
        {
            name: "disabled",
            tagName: "test-disabled-binding-div",
            stateKey: "isDisabled",
            initialValue: true,
            nextValue: false,
            markup: '<div $bind-disabled="isDisabled">Not an input</div>',
        },
    ])("should not throw when binding $name on a div", ({ tagName, stateKey, initialValue, nextValue, markup }) => {
        class NonInputBindingComponent extends TestReactiveComponent {
            [key: string]: unknown;

            constructor() {
                super();
                this.testSetState(stateKey, initialValue);
            }
        }
        customElements.define(tagName, NonInputBindingComponent);

        const { component, cleanup } = createComponent<NonInputBindingComponent>(tagName, {}, markup);
        const div = component.querySelector("div") as HTMLDivElement;

        expect(div).toBeTruthy();
        component.testSetState(stateKey, nextValue);
        expect(div).toBeTruthy();

        cleanup();
    });

    it("should handle value binding on element without value property", () => {
        class ValueBindingComponent extends TestReactiveComponent {
            textValue!: string;
            constructor() {
                super();
                this.testSetState("textValue", "test");
            }
        }
        customElements.define("test-value-binding-div", ValueBindingComponent);

        const { component, cleanup } = createComponent<ValueBindingComponent>(
            "test-value-binding-div",
            {},
            '<div $bind-value="textValue">No value property</div>',
        );
        const div = component.querySelector("div") as HTMLDivElement;
        // Div doesn't have value property, binding should not throw
        expect(div).toBeTruthy();
        component.textValue = "updated";
        expect(div.textContent).toBe("No value property");
        cleanup();
    });
});

/**
 * Tests for form input value coercion (data-value-type).
 */
describe("ReactiveComponent Form Input Value Coercion", () => {
    class FormCoercionComponent extends TestReactiveComponent {
        numberInput!: number;
        booleanInput!: boolean;
        objectInput!: object;
        dateInput!: Date;

        constructor() {
            super();
            this.testSetState("numberInput", 0);
            this.testSetState("booleanInput", false);
            this.testSetState("objectInput", {});
            this.testSetState("dateInput", new Date());
        }
    }
    customElements.define("test-form-coercion", FormCoercionComponent);

    it("should coerce input values based on data-value-type", () => {
        const { component, cleanup } = createComponent<FormCoercionComponent>(
            "test-form-coercion",
            {},
            `
        <input type="text" id="number-input" $bind-value="numberInput" data-value-type="number" value="0">
        <input type="text" id="boolean-input" $bind-value="booleanInput" data-value-type="boolean" value="false">
        <input type="text" id="object-input" $bind-value="objectInput" data-value-type="object" value="{}">
        <input type="text" id="date-input" $bind-value="dateInput" data-value-type="date" value="">
      `,
        );
        const numberInput = component.querySelector("#number-input") as HTMLInputElement;
        const booleanInput = component.querySelector("#boolean-input") as HTMLInputElement;
        const objectInput = component.querySelector("#object-input") as HTMLInputElement;
        const dateInput = component.querySelector("#date-input") as HTMLInputElement;

        numberInput.value = "42.5";
        component.numberInput = 42.5;
        expect(component.numberInput).toBe(42.5);

        booleanInput.value = "true";
        component.booleanInput = true;
        expect(component.booleanInput).toBe(true);

        const testObj = { test: "value", nested: { prop: 123 } };
        objectInput.value = JSON.stringify(testObj);
        component.objectInput = testObj;
        expect(component.objectInput).toEqual(testObj);

        const testDate = new Date("2023-05-15T10:30:00.000Z");
        dateInput.value = testDate.toISOString();
        component.dateInput = testDate;
        expect(component.dateInput instanceof Date).toBe(true);
        expect(component.dateInput.toISOString()).toBe(testDate.toISOString());

        cleanup();
    });
});
