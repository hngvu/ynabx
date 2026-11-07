with open("scripts/scraper/output/budget/full_page.html", "r", encoding="utf-8") as f:
    html = f.read()

# Look for sidebar container
start = html.find('class="sidebar')
if start != -1:
    tag_start = html.rfind('<', 0, start)
    # find closing tag for sidebar
    # Usually <div class="sidebar..." or <aside
    tag_name = html[tag_start+1:html.find(' ', tag_start)]
    print(f"Sidebar tag is <{tag_name}> at {tag_start}")
    
    # Let's find </tag_name> or end of sidebar
    # Often followed by <div class="content" or <main
    end = html.find('class="content', tag_start)
    if end != -1:
        end = html.rfind('</', 0, end)
        end = html.find('>', end) + 1
        sidebar_html = html[tag_start:end]
        print(f"Found sidebar HTML, length: {len(sidebar_html)}")
        with open("scripts/extracted_sidebar.html", "w", encoding="utf-8") as out:
            out.write(sidebar_html)
    else:
        print("Could not find end of sidebar via content class")
else:
    print("Could not find class=sidebar")
