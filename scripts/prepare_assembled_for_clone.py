with open("scripts/scraper/output/ynab_assembled_app.html", "r", encoding="utf-8") as f:
    c = f.read()

# Extract from <!-- TOP RAPID NAVIGATION BAR --> or from <body ...> until </script>
idx_body = c.find('<body')
idx_body_close = c.find('</body>')

body_content = c[c.find('>', idx_body) + 1:idx_body_close]

# Let's save body_content into clone/public/assembled_body.html
with open("clone/public/assembled_body.html", "w", encoding="utf-8") as out:
    out.write(body_content)

print("Saved clone/public/assembled_body.html, length:", len(body_content))
