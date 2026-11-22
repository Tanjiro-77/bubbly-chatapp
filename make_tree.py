from pathlib import Path
import argparse

DEFAULT_IGNORED = {
    "node_modules",
    ".git",
    ".expo",
    ".next",
    "dist",
    "build",
    "coverage",
    ".turbo",
    ".cache",
    "__pycache__",
}

def build_tree(root: Path, ignored: set[str]) -> str:
    root = root.resolve()
    lines = [f"{root.name}/"]

    def walk(directory: Path, prefix: str = ""):
        try:
            entries = [
                p for p in directory.iterdir()
                if p.name not in ignored and not p.is_symlink()
            ]
            entries.sort(key=lambda p: (p.is_file(), p.name.lower()))
        except PermissionError:
            lines.append(prefix + "└── [Permission Denied]")
            return

        for index, path in enumerate(entries):
            is_last = index == len(entries) - 1
            connector = "└── " if is_last else "├── "
            next_prefix = prefix + ("    " if is_last else "│   ")

            if path.is_dir():
                lines.append(f"{prefix}{connector}{path.name}/")
                walk(path, next_prefix)
            else:
                lines.append(f"{prefix}{connector}{path.name}")

    walk(root)
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Create a clean file tree for a project."
    )
    parser.add_argument(
        "path",
        nargs="?",
        default=".",
        help="Project folder to scan (default: current folder)",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="file-tree.txt",
        help="Output text file (default: file-tree.txt)",
    )
    parser.add_argument(
        "--include-ignored",
        action="store_true",
        help="Include normally ignored folders/files such as node_modules and .git",
    )

    args = parser.parse_args()

    root = Path(args.path)

    if not root.exists():
        print(f"❌ Folder not found: {root}")
        return

    if not root.is_dir():
        print(f"❌ This is not a folder: {root}")
        return

    ignored = set() if args.include_ignored else DEFAULT_IGNORED
    tree = build_tree(root, ignored)

    output_path = Path(args.output)
    output_path.write_text(tree, encoding="utf-8")

    print("\n✅ File tree created successfully!")
    print(f"📁 Project: {root.resolve()}")
    print(f"📄 Saved to: {output_path.resolve()}")
    print("\n" + tree)


if __name__ == "__main__":
    main()
