"""Link this checkout to its Supabase project using the CLI password prompt."""

import subprocess


if __name__ == "__main__":
    subprocess.run(
        ["supabase", "link", "--project-ref", "yocchddxdsaldgsibmmc"],
        check=True,
    )
