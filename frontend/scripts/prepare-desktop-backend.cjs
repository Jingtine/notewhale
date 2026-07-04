const fs = require("node:fs");
const path = require("node:path");

const frontendDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(frontendDir, "..");
const backendDir = path.join(rootDir, "backend");
const buildDir = path.join(frontendDir, "build");
const packagedBackendDir = path.join(buildDir, "backend");
const packagedPythonDir = path.join(buildDir, "python-runtime");
const backendVenvDir = path.join(backendDir, ".venv");
const backendSitePackagesDir = path.join(backendVenvDir, "Lib", "site-packages");

function readVenvHome() {
  const configPath = path.join(backendVenvDir, "pyvenv.cfg");
  const content = fs.readFileSync(configPath, "utf8");
  const homeLine = content
    .split(/\r?\n/)
    .find((line) => line.trim().toLowerCase().startsWith("home ="));

  if (!homeLine) {
    throw new Error(`Cannot find Python home in ${configPath}`);
  }

  return homeLine.split("=").slice(1).join("=").trim();
}

function copyDir(from, to, options = {}) {
  if (!fs.existsSync(from)) {
    throw new Error(`Missing required path: ${from}`);
  }

  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, {
    recursive: true,
    filter(source) {
      const name = path.basename(source);
      if (name === "__pycache__") return false;
      if (name.endsWith(".pyc")) return false;
      return options.filter ? options.filter(source) : true;
    },
  });
}

function copyBackendSource() {
  copyDir(backendDir, packagedBackendDir, {
    filter(source) {
      const relativePath = path.relative(backendDir, source).replace(/\\/g, "/");
      if (!relativePath) return true;
      if (relativePath === ".venv" || relativePath.startsWith(".venv/")) return false;
      if (relativePath === "uploads" || relativePath.startsWith("uploads/")) return false;
      if (relativePath.endsWith(".db")) return false;
      if (relativePath === ".env") return false;
      if (relativePath === "start_backend.ps1") return false;
      if (relativePath === "start_backend.local.ps1") return false;
      return true;
    },
  });
}

function copySitePackages() {
  copyDir(backendSitePackagesDir, path.join(packagedBackendDir, "site-packages"));
}

function copyPythonRuntime() {
  const pythonHome = process.env.NOTEWHALE_PYTHON_RUNTIME || readVenvHome();

  copyDir(pythonHome, packagedPythonDir, {
    filter(source) {
      const relativePath = path.relative(pythonHome, source).replace(/\\/g, "/");
      if (!relativePath) return true;
      if (relativePath === "Scripts" || relativePath.startsWith("Scripts/")) return false;
      if (relativePath === "include" || relativePath.startsWith("include/")) return false;
      if (relativePath === "libs" || relativePath.startsWith("libs/")) return false;
      if (relativePath.startsWith("Lib/site-packages/")) return false;
      if (relativePath.startsWith("Lib/test/")) return false;
      if (relativePath.startsWith("Lib/idlelib/")) return false;
      if (relativePath.startsWith("Lib/tkinter/")) return false;
      if (relativePath === "tcl" || relativePath.startsWith("tcl/")) return false;
      return true;
    },
  });
}

fs.mkdirSync(buildDir, { recursive: true });
copyBackendSource();
copySitePackages();
copyPythonRuntime();

console.log(`Prepared desktop backend: ${packagedBackendDir}`);
console.log(`Prepared Python runtime: ${packagedPythonDir}`);
