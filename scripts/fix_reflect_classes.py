with open("desktop/src/components/ReflectView.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    '<div className="card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>',
    '<div className="reflect-net-worth__chart-card card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>'
)

with open("desktop/src/components/ReflectView.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("Updated ReflectView chart-card successfully!")
