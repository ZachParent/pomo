export const normalizeBasePath = (basePath: string): string => {
  if (!basePath || basePath === "/") {
    return "/";
  }

  return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
};

export const withBasePath = (basePath: string, path: string): string => {
  const normalizedBase = normalizeBasePath(basePath);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedBase === "/") {
    return normalizedPath;
  }

  return `${normalizedBase}${normalizedPath}`;
};
