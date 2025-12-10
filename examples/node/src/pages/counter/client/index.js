import { define } from "@qery/reactive-component";

define("rc-counter", ({ $state, $on }) => {
    // Initialize state
    $state.count = 0;

    // Bind methods for $on* event handlers
    $on.increment = () => {
        $state.count++;
    };

    $on.decrement = () => {
        $state.count--;
    };

    $on.reset = () => {
        $state.count = 0;
    };
});
