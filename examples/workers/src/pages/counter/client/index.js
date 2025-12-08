import { define } from "@qery/reactive-component";

define("rc-counter", ({ $state, $on }) => {
    // Initialize state - will be set from HTML $state attribute
    $state.count = 0;

    // Bind methods for $on* event handlers
    $on.increment = () => {
        $state.count = $state.count + 1;
    };

    $on.decrement = () => {
        $state.count = $state.count - 1;
    };

    $on.reset = () => {
        $state.count = 0;
    };
});
