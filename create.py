import os
from pathlib import Path

BASE_DIR = "FatturaAnalyzer-v2"

# Struttura delle directory e dei file completa
structure = [
    # --- BACKEND ---
    (f"{BASE_DIR}/backend/app", ["__init__.py", "main.py", "config.py"]),
    (f"{BASE_DIR}/backend/app/models", ["__init__.py", "invoice.py", "anagraphics.py", "transaction.py", "reconciliation.py"]),
    (f"{BASE_DIR}/backend/app/api", ["__init__.py", "invoices.py", "anagraphics.py", "transactions.py", "reconciliation.py", "analytics.py", "import_export.py", "sync.py"]),
    (f"{BASE_DIR}/backend/app/adapters", ["__init__.py", "database_adapter.py", "reconciliation_adapter.py", "analytics_adapter.py", "importer_adapter.py"]),
    (f"{BASE_DIR}/backend/app/core", ["__init__.py", "database.py", "utils.py", "analysis.py", "reconciliation.py", "smart_client_reconciliation.py", "parser_xml.py", "parser_p7m.py", "parser_csv.py", "importer.py", "cloud_sync.py"]),
    (f"{BASE_DIR}/backend/app/middleware", ["__init__.py", "auth.py", "cors.py", "error_handler.py"]),
    (f"{BASE_DIR}/backend", ["Dockerfile", "requirements.txt", "run.py"]),

    # --- FRONTEND ---
    (f"{BASE_DIR}/frontend/src/components/ui", [
        "index.ts", "button.tsx", "card.tsx", "input.tsx", "table.tsx", "dialog.tsx",
        "badge.tsx", "skeleton.tsx", "dropdown-menu.tsx", "tooltip.tsx",
        "select.tsx", "label.tsx", "checkbox.tsx", "sonner.tsx",
    ]),
    (f"{BASE_DIR}/frontend/src/components/layout", ["Header.tsx", "Sidebar.tsx", "Layout.tsx"]),
    (f"{BASE_DIR}/frontend/src/components/dashboard", [
        "KPICards.tsx", "Charts.tsx", "RevenueChart.tsx", "CashFlowChart.tsx",
        "TopClientsTable.tsx", "RecentActivity.tsx", "OverdueInvoices.tsx", "DashboardView.tsx"
    ]),
    (f"{BASE_DIR}/frontend/src/components/invoices", ["InvoiceList.tsx", "InvoiceDetail.tsx", "InvoiceForm.tsx"]),
    (f"{BASE_DIR}/frontend/src/components/transactions", ["TransactionList.tsx", "TransactionImport.tsx"]),
    (f"{BASE_DIR}/frontend/src/components/reconciliation", ["ReconciliationView.tsx", "MatchSuggestions.tsx", "DragDropReconciliation.tsx", "ReconciliationActions.tsx"]),
    (f"{BASE_DIR}/frontend/src/components/anagraphics", ["AnagraphicsList.tsx", "AnagraphicsForm.tsx"]),
    (f"{BASE_DIR}/frontend/src/components/analytics", ["ReportsView.tsx", "ChartsLibrary.tsx", "ExportTools.tsx"]),

    (f"{BASE_DIR}/frontend/src/hooks", ["useApi.ts", "useInvoices.ts", "useTransactions.ts", "useReconciliation.ts", "useAnalytics.ts"]),
    
    (f"{BASE_DIR}/frontend/src/providers", [ # Cartella providers aggiunta
        "index.ts", "ThemeProvider.tsx", "AuthProvider.tsx", "QueryClientProvider.tsx"
    ]),

    (f"{BASE_DIR}/frontend/src/services", ["api.ts"]),
    (f"{BASE_DIR}/frontend/src/store", ["index.ts"]),
    (f"{BASE_DIR}/frontend/src/types", ["index.ts"]),
    (f"{BASE_DIR}/frontend/src/utils", ["formatters.ts", "validators.ts", "constants.ts"]),
    (f"{BASE_DIR}/frontend/src/lib", ["utils.ts", "validations.ts"]),
    (f"{BASE_DIR}/frontend/src/pages", [
        "DashboardPage.tsx", "InvoicesPage.tsx", "InvoiceDetailPage.tsx",
        "TransactionsPage.tsx", "TransactionDetailPage.tsx",
        "ReconciliationPage.tsx", "AnagraphicsPage.tsx", "AnagraphicsDetailPage.tsx",
        "AnalyticsPage.tsx", "ImportExportPage.tsx", "SettingsPage.tsx"
    ]),
    (f"{BASE_DIR}/frontend/src/styles", ["globals.css", "components.css"]),
    (f"{BASE_DIR}/frontend/src", ["App.tsx", "main.tsx", "vite-env.d.ts"]),
    (f"{BASE_DIR}/frontend/public/icons", []),
    (f"{BASE_DIR}/frontend/public", ["favicon.ico"]),
    (f"{BASE_DIR}/frontend", ["package.json", "vite.config.ts", "tailwind.config.js", "postcss.config.js", "tsconfig.json", "tsconfig.node.json"]),

    # --- SRC-TAURI ---
    (f"{BASE_DIR}/src-tauri/src", ["main.rs", "commands.rs", "lib.rs"]),
    (f"{BASE_DIR}/src-tauri/icons", [
        "32x32.png", "128x128.png", "icon.icns", "icon.ico",
        "Square107x107Logo.png", "Square24x24Logo.png", "Square30x30Logo.png",
        "Square44x44Logo.png", "Square70x70Logo.png", "Square150x150Logo.png",
        "Square284x284Logo.png", "Square310x310Logo.png", "StoreLogo.png"
    ]),
    (f"{BASE_DIR}/src-tauri", ["Cargo.toml", "tauri.conf.json", "build.rs"]),

    # --- SCRIPTS, DOCS, CONFIG (Root Level rispetto a BASE_DIR) ---
    (f"{BASE_DIR}/scripts", ["build.sh", "dev.sh", "release.sh"]),
    (f"{BASE_DIR}/docs", ["API.md", "SETUP.md", "DEPLOYMENT.md"]),
    (f"{BASE_DIR}/config", ["development.ini", "production.ini", "database_schema.sql"]),
    (f"{BASE_DIR}", [".env.example", ".gitignore", "README.md", "package.json"]),
]

files_to_overwrite_if_exists = [
    (".gitignore", BASE_DIR),
    (".env.example", BASE_DIR),
    ("README.md", BASE_DIR),
    ("package.json", BASE_DIR),
    ("requirements.txt", f"{BASE_DIR}/backend"),
    ("Dockerfile", f"{BASE_DIR}/backend"),
    ("package.json", f"{BASE_DIR}/frontend"),
    ("vite.config.ts", f"{BASE_DIR}/frontend"),
    ("tailwind.config.js", f"{BASE_DIR}/frontend"),
    ("postcss.config.js", f"{BASE_DIR}/frontend"),
    ("tsconfig.json", f"{BASE_DIR}/frontend"),
    ("tsconfig.node.json", f"{BASE_DIR}/frontend"),
    ("Cargo.toml", f"{BASE_DIR}/src-tauri"),
    ("tauri.conf.json", f"{BASE_DIR}/src-tauri"),
    ("build.rs", f"{BASE_DIR}/src-tauri"),
    ("main.rs", f"{BASE_DIR}/src-tauri/src"),
    # Considera se aggiungere file da providers/ se vuoi che i loro scheletri siano sovrascritti
    ("index.ts", f"{BASE_DIR}/frontend/src/providers"),
    # ("ThemeProvider.tsx", f"{BASE_DIR}/frontend/src/providers"), # Descommenta se vuoi sovrascrivere
    # ("AuthProvider.tsx", f"{BASE_DIR}/frontend/src/providers"),   # Descommenta se vuoi sovrascrivere
]

def get_file_content(file_name, dir_path_obj, base_path_obj, relative_file_path_str):
    content = ""
    # --- INIZIO LOGICA CONTENUTO FILE (identica alle versioni precedenti, inclusi i providers) ---
    if file_name.endswith((".py", ".pyw")):
        content = f"# Path: {relative_file_path_str}\n\n"
        if file_name == "__init__.py":
            content += "# This file makes Python treat the directory as a package.\n"
    elif file_name.endswith((".ts", ".tsx", ".js", ".jsx")):
        if file_name == "index.ts" and "components/ui" in str(relative_file_path_str):
            content = (f"// Path: {relative_file_path_str}\n// Barrel file for UI components.\n"
                       "// Add your exports here, e.g.:\n// export * from './button';\n")
        elif file_name == "index.ts" and "providers" in str(relative_file_path_str) and "frontend/src" in str(relative_file_path_str):
             content = (f"// Path: {relative_file_path_str}\n// Barrel file for context providers.\n"
                        "// Add your exports here, e.g.:\n// export * from './ThemeProvider';\n")
        elif file_name == "ThemeProvider.tsx" and "providers" in str(relative_file_path_str):
            content = (
                f"// Path: {relative_file_path_str}\n"
                "import React, { createContext, useState, useContext, useMemo, ReactNode } from 'react';\n\n"
                "type Theme = 'light' | 'dark';\n"
                "interface ThemeContextType { theme: Theme; setTheme: (theme: Theme) => void; toggleTheme: () => void; }\n"
                "const ThemeContext = createContext<ThemeContextType | undefined>(undefined);\n"
                "interface ThemeProviderProps { children: ReactNode; defaultTheme?: Theme; storageKey?: string; }\n\n"
                "export function ThemeProvider({ children, defaultTheme = 'system', storageKey = 'vite-ui-theme', ...props }: ThemeProviderProps) {\n"
                "  const [theme, setThemeState] = useState<Theme>(() => {\n"
                "    try {\n      const storedTheme = localStorage.getItem(storageKey) as Theme | null;\n"
                "      if (storedTheme) return storedTheme;\n"
                "      return defaultTheme === 'system' ? 'light' : defaultTheme;\n"
                "    } catch (e) { return defaultTheme === 'system' ? 'light' : defaultTheme; }\n  });\n\n"
                "  const setTheme = (newTheme: Theme) => {\n"
                "    try { localStorage.setItem(storageKey, newTheme); } catch (e) { /* ignore */ }\n"
                "    setThemeState(newTheme);\n    const root = window.document.documentElement;\n"
                "    root.classList.remove('light', 'dark'); root.classList.add(newTheme);\n  };\n\n"
                "  const toggleTheme = () => { setTheme(theme === 'light' ? 'dark' : 'light'); };\n\n"
                "  React.useEffect(() => {\n    const root = window.document.documentElement;\n"
                "    root.classList.remove('light', 'dark'); root.classList.add(theme);\n  }, [theme]);\n\n"
                "  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme]);\n\n"
                "  return (\n    <ThemeContext.Provider {...props} value={value}>\n      {children}\n    </ThemeContext.Provider>\n  );\n}\n\n"
                "export const useTheme = () => {\n  const context = useContext(ThemeContext);\n"
                "  if (context === undefined) { throw new Error('useTheme must be used within a ThemeProvider'); }\n  return context;\n};\n"
            )
        elif file_name == "AuthProvider.tsx" and "providers" in str(relative_file_path_str):
            content = (
                f"// Path: {relative_file_path_str}\n"
                "import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';\n\n"
                "interface User { id: string; username: string; }\n"
                "interface AuthContextType { user: User | null; isAuthenticated: boolean; login: (userData: User, token: string) => Promise<void>; logout: () => Promise<void>; isLoading: boolean; }\n"
                "const AuthContext = createContext<AuthContextType | undefined>(undefined);\n\n"
                "export function AuthProvider({ children }: { children: ReactNode }) {\n"
                "  const [user, setUser] = useState<User | null>(null);\n  const [isLoading, setIsLoading] = useState(true);\n\n"
                "  useEffect(() => {\n    const checkSession = async () => {\n      setIsLoading(true);\n      // Example: const token = localStorage.getItem('authToken'); if (token) { /* Validate token, fetch user */ }\n      setIsLoading(false);\n    };\n    checkSession();\n  }, []);\n\n"
                "  const login = async (userData: User, token: string) => { setUser(userData); /* localStorage.setItem('authToken', token); */ };\n\n"
                "  const logout = async () => { setUser(null); /* localStorage.removeItem('authToken'); */ };\n\n"
                "  return (\n    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading }}>\n      {children}\n    </AuthContext.Provider>\n  );\n}\n\n"
                "export const useAuth = () => {\n  const context = useContext(AuthContext);\n"
                "  if (!context) { throw new Error('useAuth must be used within an AuthProvider'); }\n  return context;\n};\n"
            )
        elif file_name == "QueryClientProvider.tsx" and "providers" in str(relative_file_path_str):
             content = (
                f"// Path: {relative_file_path_str}\n"
                "import React, { ReactNode } from 'react';\n"
                "// import { QueryClient, QueryClientProvider as RQProvider } from '@tanstack/react-query';\n\n"
                "// const queryClient = new QueryClient();\n\n"
                "export function QueryClientProviderComponent({ children }: { children: ReactNode }) {\n"
                "  // return <RQProvider client={queryClient}>{children}</RQProvider>;\n"
                "  return <>{children}</>; // Placeholder\n"
                "}\n"
            )
        else:
            content = f"// Path: {relative_file_path_str}\n"
    elif file_name.endswith(".rs"):
        content = f"// Path: {relative_file_path_str}\n"
    elif file_name.endswith(".md"):
        content = f"# {file_name.replace('.md', '')}\n\nPath: {relative_file_path_str}\n"
        if file_name == "README.md" and str(dir_path_obj) == str(base_path_obj):
             content = f"# {BASE_DIR}\n\nDescrizione del progetto FatturaAnalyzer v2.\n\nPath: {relative_file_path_str}\n"
    elif file_name == ".gitignore":
        content = ("# General ignores\n__pycache__/\n*.pyc\n*.pyo\n*.pyd\n.Python\n"
                   "env/\nvenv/\n.env\n.env.*\n!*.env.example\n.vscode/\n.idea/\n*.swp\n*.swo\n.DS_Store\n\n"
                   "# Node / Frontend\nnode_modules/\ndist/\nbuild/\ncoverage/\n*.log\n"
                   "npm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n\n"
                   "# Tauri build artifacts\nsrc-tauri/target/\nsrc-tauri/Cargo.lock\nsrc-tauri/gen/\n"
                   "*.AppImage\n*.deb\n*.rpm\n*.dmg\n*.msi\n*.app\n*.exe\n")
    elif file_name == ".env.example":
        content = ("# Environment variables example\nDEBUG=True\n\n"
                   "# Backend API configuration\nAPI_HOST=0.0.0.0\nAPI_PORT=8000\n\n"
                   "# Database (esempio per SQLite)\nDATABASE_URL=sqlite:///./fattura_analyzer.db\n\n"
                   "# Frontend\nVITE_API_BASE_URL=http://localhost:8000\n")
    elif file_name == "package.json" and str(dir_path_obj) == str(base_path_obj):
         content = ("{\n"
                   f'  "name": "{BASE_DIR.lower()}-monorepo",\n'
                   '  "version": "0.1.0",\n"private": true,\n'
                   '  "description": "Main package for FatturaAnalyzer v2.",\n'
                   '  "scripts": {\n'
                   '    "dev:backend": "cd backend && python run.py",\n'
                   '    "dev:frontend": "cd frontend && npm run dev",\n'
                   '    "dev": "echo \\"Run dev scripts or use ./scripts/dev.sh\\"",\n'
                   '    "build": "echo \\"Run build scripts or use ./scripts/build.sh\\"",\n'
                   '    "tauri:dev": "cd src-tauri && cargo tauri dev",\n'
                   '    "tauri:build": "cd src-tauri && cargo tauri build"\n'
                   '  },\n'
                   '  "workspaces": ["backend", "frontend"]\n'
                   "}")
    elif file_name == "requirements.txt" and dir_path_obj == base_path_obj / "backend":
        content = ("# Backend Python Dependencies\n"
                   "fastapi>=0.95.0,<0.110.0\nuvicorn[standard]>=0.20.0,<0.24.0\n"
                   "pydantic>=1.10.0,<3.0.0\nsqlalchemy>=1.4.0,<2.1.0\n"
                   "databases[sqlite]>=0.7.0,<0.9.0\npython-dotenv>=0.20.0,<1.1.0\n"
                   "python-jose[cryptography]>=3.3.0,<3.4.0\npasslib[bcrypt]>=1.7.4,<1.8.0\n"
                   "lxml>=4.9.0,<5.0.0\n"
                   "# pyOpenSSL>=22.0.0,<24.0.0\n# cryptography>=38.0.0,<42.0.0\n")
    elif file_name == "package.json" and dir_path_obj == base_path_obj / "frontend":
         content = ("{\n"
                   f'  "name": "frontend",\n"private": true,\n"version": "0.0.0",\n"type": "module",\n'
                   '  "scripts": {\n'
                   '    "dev": "vite",\n"build": "tsc && vite build",\n'
                   '    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",\n'
                   '    "preview": "vite preview",\n"tauri": "tauri"\n'
                   '  },\n'
                   '  "dependencies": {\n'
                   '    "react": "^18.2.0",\n"react-dom": "^18.2.0",\n"react-router-dom": "^6.15.0",\n'
                   '    "zustand": "^4.4.1",\n"axios": "^1.4.0",\n"clsx": "^2.0.0",\n'
                   '    "tailwind-merge": "^1.14.0",\n"lucide-react": "^0.274.0",\n'
                   '    "@radix-ui/react-slot": "^1.0.2",\n"tailwindcss-animate": "^1.0.7"\n'
                   '  },\n'
                   '  "devDependencies": {\n'
                   '    "@tauri-apps/api": "^1.4.0",\n"@types/react": "^18.2.15",\n"@types/react-dom": "^18.2.7",\n'
                   '    "@typescript-eslint/eslint-plugin": "^6.0.0",\n"@typescript-eslint/parser": "^6.0.0",\n'
                   '    "@vitejs/plugin-react": "^4.0.3",\n"autoprefixer": "^10.4.14",\n"eslint": "^8.45.0",\n'
                   '    "eslint-plugin-react-hooks": "^4.6.0",\n"eslint-plugin-react-refresh": "^0.4.3",\n'
                   '    "postcss": "^8.4.27",\n"tailwindcss": "^3.3.3",\n"typescript": "^5.0.2",\n"vite": "^4.4.5"\n'
                   '  }\n'
                   "}")
    elif file_name == "vite.config.ts" and dir_path_obj == base_path_obj / "frontend":
        content = ("// Path: frontend/vite.config.ts\n"
                   "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n"
                   "import path from 'path';\n\n"
                   "export default defineConfig({\n"
                   "  plugins: [react()],\n  resolve: {\n    alias: {\n      '@': path.resolve(__dirname, './src'),\n    },\n  },\n"
                   "  clearScreen: false,\n  server: {\n    port: 1420,\n    strictPort: true,\n    watch: {\n      ignored: [\"**/src-tauri/**\"],\n    },\n  },\n"
                   "  envPrefix: ['VITE_', 'TAURI_'],\n  build: {\n"
                   "    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',\n"
                   "    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,\n"
                   "    sourcemap: !!process.env.TAURI_DEBUG,\n  },\n"
                   "})")
    elif file_name == "tailwind.config.js" and dir_path_obj == base_path_obj / "frontend":
        content = ("// Path: frontend/tailwind.config.js\n/** @type {import('tailwindcss').Config} */\n"
                   "export default {\n  darkMode: ['class'],\n"
                   "  content: ['./pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],\n"
                   "  theme: {\n    container: {\n      center: true,\n      padding: '2rem',\n      screens: {\n        '2xl': '1400px',\n      },\n    },\n"
                   "    extend: {\n      keyframes: {\n        'accordion-down': { from: { height: 0 }, to: { height: 'var(--radix-accordion-content-height)' } },\n"
                   "        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: 0 } },\n      },\n"
                   "      animation: { 'accordion-down': 'accordion-down 0.2s ease-out', 'accordion-up': 'accordion-up 0.2s ease-out' },\n"
                   "    },\n  },\n  plugins: [require('tailwindcss-animate')],\n}")
    elif file_name == "postcss.config.js" and dir_path_obj == base_path_obj / "frontend":
        content = ("// Path: frontend/postcss.config.js\nexport default {\n"
                   "  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}")
    elif file_name == "tsconfig.json" and dir_path_obj == base_path_obj / "frontend":
        content = ("{\n  \"compilerOptions\": {\n"
                   "    \"target\": \"ESNext\",\n\"useDefineForClassFields\": true,\n\"lib\": [\"DOM\", \"DOM.Iterable\", \"ESNext\"],\n"
                   "    \"allowJs\": false,\n\"skipLibCheck\": true,\n\"esModuleInterop\": true,\n\"allowSyntheticDefaultImports\": true,\n"
                   "    \"strict\": true,\n\"forceConsistentCasingInFileNames\": true,\n\"module\": \"ESNext\",\n"
                   "    \"moduleResolution\": \"Bundler\",\n\"resolveJsonModule\": true,\n\"isolatedModules\": true,\n"
                   "    \"noEmit\": true,\n\"jsx\": \"react-jsx\",\n\"baseUrl\": \".\",\n\"paths\": {\n      \"@/*\": [\"./src/*\"]\n    }\n  },\n"
                   "  \"include\": [\"src\", \"vite.config.ts\", \"tailwind.config.js\", \"postcss.config.js\"],\n"
                   "  \"references\": [{ \"path\": \"./tsconfig.node.json\" }]\n}")
    elif file_name == "tsconfig.node.json" and dir_path_obj == base_path_obj / "frontend":
        content = ("{\n  \"compilerOptions\": {\n"
                   "    \"composite\": true,\n\"skipLibCheck\": true,\n\"module\": \"ESNext\",\n"
                   "    \"moduleResolution\": \"bundler\",\n\"allowSyntheticDefaultImports\": true\n  },\n"
                   "  \"include\": [\"vite.config.ts\"]\n}")
    elif file_name == "Cargo.toml" and dir_path_obj == base_path_obj / "src-tauri":
        content = ("[package]\n"
                   f'name = "{BASE_DIR.lower().replace("-", "_")}_desktop"\n'
                   'version = "0.1.0"\ndescription = "Desktop application for FatturaAnalyzer v2"\n'
                   'authors = ["Il Tuo Nome Qui"]\nlicense = ""\nrepository = ""\nedition = "2021"\n\n'
                   "[build-dependencies]\ntauri-build = { version = \"1.4.0\", features = [] }\n\n"
                   "[dependencies]\n"
                   "tauri = { version = \"1.4.0\", features = [\"shell-open\", \"http-all\", \"dialog-all\", \"fs-all\", \"path-all\"] }\n"
                   "serde = { version = \"1.0\", features = [\"derive\"] }\nserde_json = \"1.0\"\n"
                   "tokio = { version = \"1\", features = [\"full\"] }\nanyhow = \"1.0\"\nlog = \"0.4\"\nenv_logger = \"0.10\"\n\n"
                   "[features]\ncustom-protocol = [\"tauri/custom-protocol\"]\n")
    elif file_name == "tauri.conf.json" and dir_path_obj == base_path_obj / "src-tauri":
        content = ("{\n  \"$schema\": \"../node_modules/@tauri-apps/cli/schema.json\",\n"
                   '  "build": {\n'
                   '    "beforeDevCommand": "npm run dev --prefix ../frontend",\n'
                   '    "beforeBuildCommand": "npm run build --prefix ../frontend",\n'
                   '    "devPath": "http://localhost:1420",\n"distDir": "../frontend/dist",\n"withGlobalTauri": true\n  },\n'
                   '  "package": {\n    "productName": "FatturaAnalyzer-v2",\n"version": "0.1.0"\n  },\n'
                   '  "tauri": {\n    "allowlist": {\n      "all": false,\n"shell": { "open": true },\n'
                   '      "http": { "all": true, "scope": ["http://localhost:8000/*"] },\n'
                   '      "dialog": { "all": true },\n"fs": { "all": true, "scope": ["$APPDATA/*", "$DOCUMENT/*"] },\n'
                   '      "path": { "all": true }\n    },\n'
                   '    "bundle": {\n      "active": true,\n"targets": "all",\n"identifier": "com.example.fatturaanalyzer",\n'
                   '      "icon": ["icons/32x32.png", "icons/128x128.png", "icons/icon.icns", "icons/icon.ico"]\n    },\n'
                   '    "security": { "csp": null },\n'
                   '    "windows": [{\n      "fullscreen": false,\n"resizable": true,\n"title": "FatturaAnalyzer-v2",\n'
                   '      "width": 1200,\n"height": 800,\n"minWidth": 800,\n"minHeight": 600\n    }]\n  }\n}')
    elif file_name == "build.rs" and dir_path_obj == base_path_obj / "src-tauri":
        content = "// Path: src-tauri/build.rs\nfn main() {\n  tauri_build::build()\n}"
    elif file_name == "main.rs" and dir_path_obj == base_path_obj / "src-tauri" / "src":
         content = ("// Prevents additional console window on Windows in release, DO NOT REMOVE!!\n"
                    "#![cfg_attr(not(debug_assertions), windows_subsystem = \"windows\")]\n\n"
                    "#[tauri::command]\nfn greet(name: &str) -> String {\n"
                    "    format!(\"Hello, {}! You've been greeted from Rust!\", name)\n}\n\n"
                    "fn main() {\n    tauri::Builder::default()\n"
                    "        .invoke_handler(tauri::generate_handler![greet])\n"
                    "        .run(tauri::generate_context!())\n"
                    "        .expect(\"error while running tauri application\");\n}")
    # --- FINE LOGICA CONTENUTO FILE ---
    return content

def create_or_update_project_structure():
    base_path = Path(BASE_DIR)
    if not base_path.exists():
        print(f"La directory base '{BASE_DIR}' non esiste. Creala prima o esegui lo script di creazione completo.")
        return
    if not base_path.is_dir():
        print(f"'{BASE_DIR}' esiste ma non è una directory.")
        return

    print(f"Verifica e aggiornamento della struttura del progetto in: {base_path.resolve()}")

    for dir_path_str_template, files_in_dir in structure:
        dir_path = Path(dir_path_str_template)

        if not dir_path.exists():
            dir_path.mkdir(parents=True, exist_ok=True)
            print(f"  Creata directory mancante: {dir_path.resolve()}")
        elif not dir_path.is_dir():
            print(f"  ATTENZIONE: Prevista directory ma trovato file: {dir_path.resolve()} - Saltato.")
            continue
        else:
            print(f"  Verificata directory esistente: {dir_path.resolve()}")

        for file_name in files_in_dir:
            file_path = dir_path / file_name
            relative_file_path_str = str(file_path.relative_to(base_path))
            
            should_overwrite_this_file = False
            for fname_to_overwrite, fdir_template_to_overwrite in files_to_overwrite_if_exists:
                fdir_to_overwrite = Path(fdir_template_to_overwrite)
                if file_name == fname_to_overwrite and dir_path == fdir_to_overwrite:
                    should_overwrite_this_file = True
                    break
            
            file_content_to_write = get_file_content(file_name, dir_path, base_path, relative_file_path_str)

            if not file_path.exists():
                print(f"    Creato file mancante: {file_path.resolve()}")
                try:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(file_content_to_write)
                except Exception as e:
                    print(f"      ERRORE durante la scrittura del nuovo file {file_path}: {e}")
            elif should_overwrite_this_file:
                print(f"    Sovrascritto file di configurazione: {file_path.resolve()}")
                try:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(file_content_to_write)
                except Exception as e:
                    print(f"      ERRORE durante la sovrascrittura del file {file_path}: {e}")
            else:
                print(f"    File esistente, contenuto non modificato: {file_path.resolve()}")

    print(f"\nVerifica e aggiornamento della struttura del progetto '{BASE_DIR}' completati.")
    print("Rivedi l'output per eventuali messaggi di attenzione o errore.")
    print("\nPassi successivi suggeriti (se non già fatti):")
    print(f"1. Naviga in '{BASE_DIR}/frontend' ed esegui 'npm install' (o yarn/pnpm).")
    print(f"2. Assicurati che l'ambiente virtuale per il backend in '{BASE_DIR}/backend' sia attivo e le dipendenze da 'requirements.txt' siano installate.")
    print(f"3. Controlla/installa le dipendenze di sistema per Tauri e poi esegui 'cargo check' o 'cargo build' in '{BASE_DIR}/src-tauri'.")

if __name__ == "__main__":
    if not os.path.exists(BASE_DIR) or not os.path.isdir(BASE_DIR):
        print(f"ERRORE: La cartella base del progetto '{BASE_DIR}' non esiste o non è una directory.")
        print("Questo script è pensato per CORREGGERE una struttura esistente.")
        print(f"Esegui prima lo script di creazione completo se '{BASE_DIR}' non esiste, oppure assicurati che lo script sia nella directory genitore di '{BASE_DIR}'.")
        exit()

    print(f"Questo script verificherà la struttura della cartella '{BASE_DIR}' e aggiungerà file/cartelle mancanti.")
    print("Alcuni file di configurazione di base (definiti in 'files_to_overwrite_if_exists') verranno sovrascritti se esistono.")
    print("I file di codice esistenti non verranno modificati nel loro contenuto se non sono in tale lista.")
    confirm = input(f"Continuare? (s/N): ")
    if confirm.lower() != 's':
        print("Operazione annullata.")
        exit()

    create_or_update_project_structure()