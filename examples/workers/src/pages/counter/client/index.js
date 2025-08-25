import { ReactiveComponent } from "@qery/reactive-component";

export class RcCounter extends ReactiveComponent {
    count = 0;

    connectedCallback() {
        super.connectedCallback();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
    }

    increment() {
        this.count++;
    }

    decrement() {
        this.count--;
    }

    reset() {
        this.count = 0;
    }
}

customElements.define("rc-counter", RcCounter);
