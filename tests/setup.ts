import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement scrollIntoView (guard for node environment tests)
if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView = () => {};
}
