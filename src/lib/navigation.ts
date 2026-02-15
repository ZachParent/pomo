interface NavigateOptions {
  replace?: boolean;
}

export const navigate = (to: string, options: NavigateOptions = {}): void => {
  if (import.meta.env.SSR) {
    return;
  }

  const { replace = false } = options;
  if (replace) {
    window.history.replaceState(window.history.state, "", to);
  } else {
    window.history.pushState(window.history.state, "", to);
  }

  window.dispatchEvent(new PopStateEvent("popstate"));
};
