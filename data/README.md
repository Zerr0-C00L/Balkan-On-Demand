# Data Directory

This directory contains the addon's content database and configuration files.

## Files

### `baubau-content.json`
Auto-generated database of movies and series. Updated by GitHub Actions workflow.

**Do not edit manually** - this file is automatically regenerated.

### `translations.json`
Serbian/Croatian to English title translations for better metadata matching.

**You can edit this file!** Add translations to improve metadata matching for content without year information.

## Contributing Translations

To add new translations, edit `translations.json` and add entries to the `serbian_to_english` object:

```json
{
  "serbian_to_english": {
    "Serbian Title": "English Title",
    "Novi Film": "New Movie"
  }
}
```

### Guidelines:

1. **Use the most common Serbian/Croatian title** as the key
2. **Use the official English title** as the value
3. **Keep it simple** - the code will handle sequel numbers automatically
4. **Test it** - start the addon and check if metadata appears

### Examples:

```json
{
  "Kung Fu Panda": "Kung Fu Panda",      // Will match "Kung Fu Panda 4"
  "U Mojoj Glavi": "Inside Out",         // Will match "U Mojoj Glavi 2"
  "Neukrotivi Robot": "The Wild Robot"   // Exact translation
}
```

## How It Works

When a movie doesn't have a year in the database:

1. **Check translations.json** for Serbian → English mapping
2. **Extract sequel numbers** (e.g., "4" from "Kung Fu Panda 4")
3. **Search OMDb** with English title
4. **Get metadata** (description, cast, genres, etc.)

Without translations, movies with Serbian titles won't get metadata enrichment.

## Pull Requests Welcome!

Know a Serbian/Croatian translation that's missing? Submit a PR to add it to `translations.json`!
