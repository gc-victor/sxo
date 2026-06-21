import { createComponent, TestReactiveComponent } from "@tests/utils/test-helpers";
import { describe, expect, it } from "vitest";
import type { StateValue } from "@/index";

describe("ReactiveComponent Custom Binding Handlers", () => {
    class CustomBindingComponent extends TestReactiveComponent {
        progress!: number;
        fontSize!: number;
        textColor!: string;
        isHighlighted!: boolean;
        configuration!: { size: number; color: string; isBold: boolean; padding: number };

        constructor() {
            super();
            this.testSetState("progress", 0);
            this.testSetState("fontSize", 16);
            this.testSetState("textColor", "black");
            this.testSetState("isHighlighted", false);
            this.testSetState("configuration", {
                size: 14,
                color: "blue",
                isBold: false,
                padding: 5,
            });
        }

        protected customBindingHandlers({
            element,
            bindingName: _bindingName, // Fix: bindingName is unused, prefix with _
            rawValue,
        }: {
            element: HTMLElement;
            bindingName: string;
            rawValue: StateValue; // StateValue is unknown
        }): Record<string, () => void> {
            return {
                "custom-progress": () => {
                    if (element instanceof HTMLElement) {
                        // Expecting number or string for progress value
                        if (typeof rawValue === "number" || typeof rawValue === "string") {
                            element.setAttribute("aria-valuenow", String(rawValue));
                            element.style.width = `${rawValue}%`;
                        } else {
                            // Handle unexpected type, e.g., reset or log
                            element.setAttribute("aria-valuenow", "0");
                            element.style.width = "0%";
                        }
                    }
                },
                "custom-font-size": () => {
                    if (element instanceof HTMLElement) {
                        // Expecting number or string for font size
                        if (typeof rawValue === "number" || typeof rawValue === "string") {
                            element.style.fontSize = `${rawValue}px`;
                        } else {
                            element.style.fontSize = ""; // Reset
                        }
                    }
                },
                "custom-text-color": () => {
                    if (element instanceof HTMLElement) {
                        // Expecting string for color
                        if (typeof rawValue === "string") {
                            // Fix: Check if rawValue is a string
                            element.style.color = rawValue;
                        } else {
                            element.style.color = ""; // Reset if not a string
                        }
                    }
                },
                "custom-highlight": () => {
                    if (element instanceof HTMLElement) {
                        // Expecting boolean for highlight
                        if (typeof rawValue === "boolean") {
                            if (rawValue === true) {
                                element.classList.add("highlight");
                                element.setAttribute("data-highlighted", "true");
                            } else {
                                element.classList.remove("highlight");
                                element.removeAttribute("data-highlighted");
                            }
                        } else {
                            // Handle non-boolean, e.g., remove highlight
                            element.classList.remove("highlight");
                            element.removeAttribute("data-highlighted");
                        }
                    }
                },
                "custom-style-config": () => {
                    if (element instanceof HTMLElement && typeof rawValue === "object" && rawValue !== null) {
                        // Fix: Assert rawValue to a type that includes the expected properties
                        const config = rawValue as {
                            size?: number | string;
                            color?: string;
                            isBold?: boolean;
                            padding?: number | string;
                        };

                        // Fix: Safely access properties and check types before applying styles
                        if (config.size !== undefined && (typeof config.size === "number" || typeof config.size === "string")) {
                            element.style.fontSize = `${config.size}px`;
                        } else {
                            element.style.fontSize = "";
                        }
                        if (config.color !== undefined && typeof config.color === "string") {
                            element.style.color = config.color;
                        } else {
                            element.style.color = "";
                        }
                        if (config.isBold !== undefined && typeof config.isBold === "boolean") {
                            element.style.fontWeight = config.isBold ? "bold" : "normal";
                        } else {
                            element.style.fontWeight = ""; // Reset if not boolean or undefined
                        }
                        if (config.padding !== undefined && (typeof config.padding === "number" || typeof config.padding === "string")) {
                            element.style.padding = `${config.padding}px`;
                        } else {
                            element.style.padding = "";
                        }
                    } else {
                        // Handle non-object rawValue by resetting styles
                        element.style.fontSize = "";
                        element.style.color = "";
                        element.style.fontWeight = "";
                        element.style.padding = "";
                    }
                },
            };
        }

        setProgress(value: number) {
            this.progress = value;
        }
        updateConfig(updates: Partial<typeof this.configuration>) {
            this.configuration = { ...this.configuration, ...updates };
        }
        toggleHighlight() {
            this.isHighlighted = !this.isHighlighted;
        }
    }
    customElements.define("test-custom-class-style-binding", CustomBindingComponent);

    it("should apply custom progress binding on initial state and update", () => {
        const { component, cleanup } = createComponent<CustomBindingComponent>(
            "test-custom-class-style-binding",
            {},
            '<div $bind-custom-progress="progress" class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"></div>',
        );
        const progressBar = component.querySelector(".progress-bar") as HTMLElement;
        expect(progressBar).not.toBeNull();

        // Initially 0
        expect(progressBar.getAttribute("aria-valuenow")).toBe("0");
        expect(progressBar.style.width).toBe("0%");

        // Update to 50 through reactive system
        component.setProgress(50);
        expect(progressBar.getAttribute("aria-valuenow")).toBe("50");
        expect(progressBar.style.width).toBe("50%");

        // Update to 75 through reactive system
        component.setProgress(75);
        expect(progressBar.getAttribute("aria-valuenow")).toBe("75");
        expect(progressBar.style.width).toBe("75%");

        cleanup();
    });

    it("should handle multiple custom bindings on the same element", () => {
        const { component, cleanup } = createComponent<CustomBindingComponent>(
            "test-custom-class-style-binding",
            {},
            '<div $bind-custom-font-size="fontSize" $bind-custom-text-color="textColor">Text</div>',
        );
        const textElement = component.querySelector("div") as HTMLElement;

        // Initially 16px font size and black color
        expect(textElement.style.fontSize).toBe("16px");
        expect(textElement.style.color).toBe("black");

        // Update through reactive system
        component.fontSize = 24;
        component.textColor = "red";
        expect(textElement.style.fontSize).toBe("24px");
        expect(textElement.style.color).toBe("red");

        cleanup();
    });

    it("should conditionally apply custom highlight binding based on state", () => {
        const { component, cleanup } = createComponent<CustomBindingComponent>(
            "test-custom-class-style-binding",
            {},
            '<div $bind-custom-highlight="isHighlighted">Text</div>',
        );
        const element = component.querySelector("div") as HTMLElement;

        // Initially not highlighted
        expect(element.classList.contains("highlight")).toBe(false);
        expect(element.hasAttribute("data-highlighted")).toBe(false);

        // Toggle highlight on through reactive system
        component.toggleHighlight();
        expect(component.isHighlighted).toBe(true);
        expect(element.classList.contains("highlight")).toBe(true);
        expect(element.hasAttribute("data-highlighted")).toBe(true);

        // Toggle highlight off through reactive system
        component.toggleHighlight();
        expect(component.isHighlighted).toBe(false);
        expect(element.classList.contains("highlight")).toBe(false);
        expect(element.hasAttribute("data-highlighted")).toBe(false);

        cleanup();
    });

    it("should handle complex object state in custom style bindings", () => {
        const { component, cleanup } = createComponent<CustomBindingComponent>(
            "test-custom-class-style-binding",
            {},
            '<div $bind-custom-style-config="configuration">Text</div>',
        );
        const element = component.querySelector("div") as HTMLElement;

        // Initially configured with default values
        expect(element.style.fontSize).toBe("14px");
        expect(element.style.color).toBe("blue");
        expect(element.style.fontWeight).toBe("normal");
        expect(element.style.padding).toBe("5px");

        // Update configuration through reactive system
        component.updateConfig({
            size: 18,
            isBold: true,
            padding: 10,
        });
        expect(element.style.fontSize).toBe("18px");
        expect(element.style.fontWeight).toBe("bold");
        expect(element.style.padding).toBe("10px");

        cleanup();
    });
});
