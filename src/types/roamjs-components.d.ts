declare module "roamjs-components/dom/createObserver" {
  function createObserver(
    callback: () => void,
    ms?: number
  ): {
    disconnect: () => void;
  };
  export default createObserver;
}
