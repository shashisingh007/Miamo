"""miamo-cli — unified operations CLI for the Miamo monorepo."""

from __future__ import annotations

import click

__version__ = "1.0.0"

# ─── Global Click default: make `-h` work as an alias for `--help` on every
# command and group. Patching Click's global `Context.default_help_option_names`
# means we don't need `context_settings={...}` on every one of the 14
# command modules — every group/subcommand gets `-h` for free.
click.Context.default_help_option_names = ("-h", "--help")
