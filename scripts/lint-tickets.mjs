import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const tasksDir = path.join(rootDir, "docs", "tasks");
const tasksIndexPath = path.join(rootDir, "docs", "tasks.md");

const ticketFilePattern = /^\d{4}-[a-z0-9-]+\.md$/;
const sectionHeadings = [
  "## Summary",
  "## Scope",
  "### In scope",
  "### Out of scope",
  "## Likely Files",
  "## Acceptance Criteria",
  "## Notes",
];

const validStatuses = new Set(["ready", "in_progress", "blocked", "done"]);
const validPriorities = new Set(["P1", "P2", "P3"]);
const validTypes = new Set(["bug", "feature", "chore"]);
const requiredMetadataKeys = [
  "Status",
  "Priority",
  "Type",
  "Owner",
  "Created",
  "Updated",
  "Depends on",
  "Parallel-safe",
  "Suggested branch",
  "Suggested worktree",
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const readText = async (targetPath) =>
  fs.readFile(targetPath, {
    encoding: "utf8",
  });

const findMetadataValue = (content, key) => {
  const pattern = new RegExp(`^- ${escapeRegex(key)}: \`([^\`]+)\`$`, "m");
  const match = content.match(pattern);
  return match?.[1] ?? null;
};

const findSectionBody = (content, sectionHeading) => {
  const headingToken = `${sectionHeading}\n`;
  const startIndex = content.indexOf(headingToken);
  if (startIndex === -1) {
    return null;
  }

  const bodyStart = startIndex + headingToken.length;
  const remaining = content.slice(bodyStart);
  const nextHeadingMatch = remaining.match(/\n## |\n### /);
  const bodyEnd =
    nextHeadingMatch === null ? content.length : bodyStart + nextHeadingMatch.index;

  return content.slice(bodyStart, bodyEnd);
};

const extractTaskLinks = (content) => {
  const links = [];
  const regex = /\(tasks\/(\d{4}-[a-z0-9-]+\.md)\)/g;
  let match = regex.exec(content);

  while (match) {
    links.push(match[1]);
    match = regex.exec(content);
  }

  return links;
};

const extractSection = (content, sectionHeading) => {
  return findSectionBody(content, sectionHeading) ?? "";
};

const extractTicketEntries = (content, sectionHeading) => {
  const section = extractSection(content, sectionHeading);
  const entries = [];
  const regex = /- \[([ xX])\] \[[^\]]+\]\(tasks\/(\d{4}-[a-z0-9-]+\.md)\)/g;
  let match = regex.exec(section);

  while (match) {
    entries.push({
      checked: match[1].toLowerCase() === "x",
      file: match[2],
    });
    match = regex.exec(section);
  }

  return entries;
};

const lintTickets = async () => {
  const errors = [];
  const entries = await fs.readdir(tasksDir, { withFileTypes: true });
  const ticketFiles = entries
    .filter((entry) => entry.isFile() && ticketFilePattern.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  if (ticketFiles.length === 0) {
    errors.push("No ticket files found in docs/tasks.");
    return { errors, statusByFile: new Map(), ticketFiles };
  }

  const statusByFile = new Map();

  for (const file of ticketFiles) {
    const fullPath = path.join(tasksDir, file);
    const content = await readText(fullPath);
    const ticketId = file.slice(0, 4);

    if (!content.startsWith(`# ${ticketId} - `)) {
      errors.push(`${file}: top-level heading must start with "# ${ticketId} - ".`);
    }

    const metadata = new Map();
    for (const key of requiredMetadataKeys) {
      const value = findMetadataValue(content, key);
      if (!value) {
        errors.push(`${file}: missing metadata line for "${key}".`);
        continue;
      }
      metadata.set(key, value);
    }

    const status = metadata.get("Status");
    if (status) {
      statusByFile.set(file, status);
      if (!validStatuses.has(status)) {
        errors.push(
          `${file}: invalid Status "${status}" (expected one of ready, in_progress, blocked, done).`
        );
      }
    }

    const priority = metadata.get("Priority");
    if (priority && !validPriorities.has(priority)) {
      errors.push(`${file}: invalid Priority "${priority}" (expected P1, P2, or P3).`);
    }

    const type = metadata.get("Type");
    if (type && !validTypes.has(type)) {
      errors.push(`${file}: invalid Type "${type}" (expected bug, feature, or chore).`);
    }

    const created = metadata.get("Created");
    if (created && !/^\d{4}-\d{2}-\d{2}$/.test(created)) {
      errors.push(`${file}: Created must use YYYY-MM-DD format.`);
    }

    const updated = metadata.get("Updated");
    if (updated && !/^\d{4}-\d{2}-\d{2}$/.test(updated)) {
      errors.push(`${file}: Updated must use YYYY-MM-DD format.`);
    }

    const dependsOn = metadata.get("Depends on");
    if (dependsOn && !/^(none|\d{4})$/.test(dependsOn)) {
      errors.push(`${file}: Depends on must be "none" or a 4-digit ticket ID.`);
    }

    const parallelSafe = metadata.get("Parallel-safe");
    if (parallelSafe && !/^(yes|no)$/.test(parallelSafe)) {
      errors.push(`${file}: Parallel-safe must be "yes" or "no".`);
    }

    const suggestedBranch = metadata.get("Suggested branch");
    if (suggestedBranch && !/^codex\/[-a-z0-9]+$/.test(suggestedBranch)) {
      errors.push(
        `${file}: Suggested branch must start with "codex/" and use kebab-case.`
      );
    }

    for (const heading of sectionHeadings) {
      if (!content.includes(`\n${heading}\n`)) {
        errors.push(`${file}: missing required section "${heading}".`);
      }
    }

    const sectionPositions = sectionHeadings.map((heading) =>
      content.indexOf(`\n${heading}\n`)
    );
    for (let index = 1; index < sectionPositions.length; index += 1) {
      if (
        sectionPositions[index] !== -1 &&
        sectionPositions[index - 1] !== -1 &&
        sectionPositions[index] < sectionPositions[index - 1]
      ) {
        errors.push(
          `${file}: section "${sectionHeadings[index]}" appears out of order.`
        );
      }
    }

    const likelyFilesBody = findSectionBody(content, "## Likely Files");
    if (likelyFilesBody && !/- `[^`]+`/.test(likelyFilesBody)) {
      errors.push(
        `${file}: Likely Files section must include at least one backticked file path.`
      );
    }

    const acceptanceBody = findSectionBody(content, "## Acceptance Criteria");
    if (acceptanceBody && !/- \[(?: |x|X)\] /.test(acceptanceBody)) {
      errors.push(
        `${file}: Acceptance Criteria section must include at least one checklist item.`
      );
    }
  }

  return {
    errors,
    statusByFile,
    ticketFiles,
  };
};

const lintTaskIndex = async (ticketFiles, statusByFile) => {
  const errors = [];
  const content = await readText(tasksIndexPath);
  const ticketFileSet = new Set(ticketFiles);

  const allLinks = extractTaskLinks(content);
  for (const linkedFile of allLinks) {
    if (!ticketFileSet.has(linkedFile)) {
      errors.push(`docs/tasks.md references missing ticket file: ${linkedFile}`);
    }
  }

  const openEntries = extractTicketEntries(content, "## Open Tickets");
  const completedEntries = extractTicketEntries(content, "## Completed Tickets");

  const openSet = new Set(openEntries.map((entry) => entry.file));
  const completedSet = new Set(completedEntries.map((entry) => entry.file));

  for (const entry of openEntries) {
    if (entry.checked) {
      errors.push(`docs/tasks.md Open Tickets entry must use [ ] for ${entry.file}`);
    }
  }

  for (const entry of completedEntries) {
    if (!entry.checked) {
      errors.push(
        `docs/tasks.md Completed Tickets entry must use [x] for ${entry.file}`
      );
    }
  }

  for (const file of openSet) {
    if (completedSet.has(file)) {
      errors.push(
        `docs/tasks.md lists ${file} in both Open Tickets and Completed Tickets.`
      );
    }
  }

  for (const ticketFile of ticketFiles) {
    if (!openSet.has(ticketFile) && !completedSet.has(ticketFile)) {
      errors.push(
        `docs/tasks.md missing ticket in Open/Completed sections: ${ticketFile}`
      );
    }
  }

  for (const listedFile of [...openSet, ...completedSet]) {
    if (!ticketFileSet.has(listedFile)) {
      errors.push(
        `docs/tasks.md lists non-existent ticket in Open/Completed: ${listedFile}`
      );
    }
  }

  for (const ticketFile of ticketFiles) {
    const status = statusByFile.get(ticketFile);
    if (!status) {
      continue;
    }

    if (status === "done" && !completedSet.has(ticketFile)) {
      errors.push(
        `${ticketFile}: status is "done" but docs/tasks.md does not list it in Completed Tickets.`
      );
    }

    if (status !== "done" && !openSet.has(ticketFile)) {
      errors.push(
        `${ticketFile}: status is "${status}" but docs/tasks.md does not list it in Open Tickets.`
      );
    }
  }

  return errors;
};

const main = async () => {
  const ticketLintResult = await lintTickets();
  const indexErrors = await lintTaskIndex(
    ticketLintResult.ticketFiles,
    ticketLintResult.statusByFile
  );

  const allErrors = [...ticketLintResult.errors, ...indexErrors];
  if (allErrors.length > 0) {
    console.error("Ticket lint failed:");
    for (const error of allErrors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `Ticket lint passed (${ticketLintResult.ticketFiles.length} tickets checked).\n`
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
