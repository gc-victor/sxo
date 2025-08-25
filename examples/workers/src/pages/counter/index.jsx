import { Counter } from "./counter.jsx";

export const head = {
    title: "Counter",
    script: { src: "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" },
};

export default () => (
    <main className="flex flex-col items-center justify-center h-screen space-y-8">
        <h1 className="text-4xl font-bold mb-8">Counters</h1>
        <Counter count={0} />
        <Counter count={0} />
        <Counter count={0} />
    </main>
);
