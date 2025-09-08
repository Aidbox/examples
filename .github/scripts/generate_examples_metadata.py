#!/usr/bin/env python3
"""
Generate examples metadata for Aidbox documentation.
This script should be run from the root of the examples repository.
"""

import os
import json
import re
from datetime import datetime
from pathlib import Path

def parse_readme_frontmatter(readme_path):
    """Extract frontmatter from README.md"""
    with open(readme_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract frontmatter between ---
    frontmatter_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not frontmatter_match:
        return None
    
    frontmatter = frontmatter_match.group(1)
    
    # Parse features and languages
    features = []
    languages = []
    
    # Match features: [feature1, feature2, ...]
    features_match = re.search(r'features:\s*\[(.*?)\]', frontmatter)
    if features_match:
        features_raw = features_match.group(1)
        # Clean up and split
        features = [f.strip().strip('"\'') for f in features_raw.split(',')]
    
    # Match languages: [lang1, lang2, ...]
    languages_match = re.search(r'languages:\s*\[(.*?)\]', frontmatter)
    if languages_match:
        languages_raw = languages_match.group(1)
        # Clean up and split
        languages = [l.strip().strip('"\'') for l in languages_raw.split(',')]
    
    return {
        'features': features,
        'languages': languages
    }

def extract_title_and_description(readme_path):
    """Extract title (first # heading) and description (first paragraph)"""
    with open(readme_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove frontmatter
    content = re.sub(r'^---\n.*?\n---\n', '', content, flags=re.DOTALL)
    
    # Extract title (first # heading)
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    if title_match:
        title = title_match.group(1).strip()
    else:
        # Fallback to directory name
        title = os.path.basename(os.path.dirname(readme_path))
        # Convert kebab-case to Title Case
        title = ' '.join(word.capitalize() for word in title.split('-'))
    
    # Extract description (first non-empty paragraph after title)
    lines = content.split('\n')
    description = ""
    in_paragraph = False
    skip_next = False
    
    for i, line in enumerate(lines):
        # Skip title line
        if line.startswith('#'):
            in_paragraph = True
            continue
        
        # Skip empty lines after title
        if in_paragraph and not line.strip():
            continue
        
        # Get first content line that's not a list or code block
        if in_paragraph and line.strip():
            if not line.startswith('-') and not line.startswith('*') and not line.startswith('```'):
                description = line.strip()
                break
    
    # If no description found, generate one from features
    if not description:
        metadata = parse_readme_frontmatter(readme_path)
        if metadata and metadata['features']:
            features_str = ', '.join(metadata['features'][:3])
            description = f"Example demonstrating {features_str}"
    
    return title, description

def generate_examples_metadata():
    """Generate metadata for all examples"""
    examples = []
    all_features = set()
    all_languages = set()
    
    # Walk through all directories
    for root, dirs, files in os.walk('.'):
        # Skip hidden directories, scripts, and node_modules
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['scripts', 'node_modules']]
        
        if 'README.md' in files:
            readme_path = os.path.join(root, 'README.md')
            
            # Skip root README
            if readme_path == './README.md':
                continue
            
            metadata = parse_readme_frontmatter(readme_path)
            if metadata:
                title, description = extract_title_and_description(readme_path)
                
                # Generate ID from path (remove ./ prefix and replace / with -)
                example_id = root.replace('./', '').replace('/', '-')
                if not example_id:  # Root directory
                    continue
                
                # GitHub URLs
                github_path = root.replace('./', '')
                github_url = f"https://github.com/Aidbox/examples/tree/main/{github_path}"
                readme_url = f"https://github.com/Aidbox/examples/blob/main/{github_path}/README.md"
                
                example = {
                    'id': example_id,
                    'title': title,
                    'description': description or f"Example demonstrating {', '.join(metadata['features'][:3])}",
                    'features': metadata['features'],
                    'languages': metadata['languages'],
                    'github_url': github_url,
                    'readme_url': readme_url
                }
                
                examples.append(example)
                all_features.update(metadata['features'])
                all_languages.update(metadata['languages'])
                
                print(f"✓ Processed: {github_path}")
            else:
                print(f"⚠ No frontmatter found in: {readme_path}")
    
    # Sort examples by title
    examples.sort(key=lambda x: x['title'].lower())
    
    # Sort features and languages
    features_list = sorted(list(all_features))
    languages_list = sorted(list(all_languages))
    
    result = {
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'examples': examples,
        'features_list': features_list,
        'languages_list': languages_list
    }
    
    return result

def main():
    """Main function"""
    print("Generating examples metadata...")
    print("-" * 40)
    
    metadata = generate_examples_metadata()
    
    # Write to file
    output_file = 'examples-metadata.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    print("-" * 40)
    print(f"✓ Generated metadata for {len(metadata['examples'])} examples")
    print(f"✓ Found {len(metadata['features_list'])} unique features")
    print(f"✓ Found {len(metadata['languages_list'])} programming languages")
    print(f"✓ Output saved to: {output_file}")
    
    # Print summary
    print("\nLanguages found:", ', '.join(metadata['languages_list']))
    print("\nTop features (first 10):", ', '.join(metadata['features_list'][:10]))
    if len(metadata['features_list']) > 10:
        print(f"  ... and {len(metadata['features_list']) - 10} more")

if __name__ == '__main__':
    main()