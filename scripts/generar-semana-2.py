"""
Arma el paquete PRIVADO de la Semana 2 para Imperium OS:
  · la doctrina resumida (privado/doctrina-semana-2.json, escrita a mano)
  · tu Self Transcendence Doc (texto + las páginas de imágenes)
  · tus respuestas a los ejercicios (los .docx llenados)

Salida: public/privado/semana-2.json — fuera de git y del deploy (.gitignore y .vercelignore).
La app lo carga una sola vez a tu base de datos.

Uso:  python scripts/generar-semana-2.py  "ruta/al/Self Transcendence Doc.pdf"  "ruta/a/suplementarios"
"""

import base64
import json
import re
import sys
from pathlib import Path

import fitz  # pymupdf
import docx  # python-docx

RAIZ = Path(__file__).resolve().parent.parent
PDF = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Desktop" / "Nico Cadena Self Trascendence Doc v1.1.pdf"
SUPL = Path(sys.argv[2]) if len(sys.argv) > 2 else Path.home() / "Desktop" / "Nico Cadena Second Brain" / "imperium" / "raw" / "ingested" / "imperium-academy-semana-2" / "suplementarios"

doctrina = json.loads((RAIZ / "privado" / "doctrina-semana-2.json").read_text(encoding="utf-8"))
pdf = fitz.open(PDF)
pag = [p.get_text() for p in pdf]


def lineas(t):
    return [l.strip() for l in t.splitlines() if l.strip()]


def numerados(texto, cierre):
    """'1. Título\ntexto…  2. …' → [{titulo, texto}] (el título es la primera oración)."""
    texto = texto.split(cierre)[0]
    partes = re.split(r"(?:^|\n)\s*(\d)\.\s*", texto)
    out = []
    for i in range(1, len(partes), 2):
        cuerpo = " ".join(partes[i + 1].split())
        out.append(cuerpo)
    return out


# ── Principios (p3) ─────────────────────────────────────────────────────
principios = []
for cuerpo in numerados(pag[2], "IMPORTANT THINGS TO REMEMBER"):
    m = re.match(r"(.+?[.!])\s+(.*)", cuerpo)
    principios.append({"titulo": m.group(1) if m else cuerpo, "texto": m.group(2) if m else ""})

# ── Ritual (p4) ─────────────────────────────────────────────────────────
ritual = numerados(pag[3], "DAILY RITUAL")

# ── Manifiesto (p13) ────────────────────────────────────────────────────
man = pag[12].split("¿Quién es Nicolás Cadena?")[1]
manifiesto = [" ".join(p.split()) for p in re.split(r"\n(?=Nicolás )", man) if p.strip()]

# ── Rasgos, estilo, rutina, mentores (p14) ──────────────────────────────
p14 = pag[13]
bloque_rasgos = p14.split("Character Traits")[1].split("Body Type & Style")[0]
rasgos = []
for r in re.split(r"\n•\s*", "\n" + bloque_rasgos):
    r = " ".join(r.split())
    if not r:
        continue
    nombre, _, desc = r.partition(":")
    rasgos.append({"nombre": nombre.strip(), "texto": desc.strip()})
estilo = [" ".join(x.split()) for x in re.split(r"\n•\s*", p14.split("Body Type & Style")[1].split("Routine")[0]) if x.strip()]
rutina_txt = p14.split("Routine")[1].split("Standard:")[0]
rutina = []
for l in lineas(rutina_txt):
    m = re.match(r"(\d{2}:?\d{2})\s*-\s*(.*)", l)
    if m:
        h = m.group(1) if ":" in m.group(1) else m.group(1)[:2] + ":" + m.group(1)[2:]
        rutina.append({"hora": h, "actividad": m.group(2)})
estandar_rutina = "Standard:" + p14.split("Standard:")[1].split("Mentors")[0].strip()
mentores = lineas(p14.split("Mentors")[1].split("TRAITS, STYLE")[0])[0]

# ── Metas y estándares (p15) ────────────────────────────────────────────
p15 = pag[14]


def lista_numerada(t):
    out, actual = [], None
    for l in lineas(t):
        m = re.match(r"(\d+)\.\s*(.*)", l)
        if m:
            actual = m.group(2)
            out.append(actual)
        elif out:
            out[-1] += " " + l
    return out


grupos = {}
for nombre, desde, hasta in [
    ("Riqueza", "Wealth Goals", "Business Goals"),
    ("Negocio", "Business Goals", "Health & Fitness Goals"),
    ("Salud y estado físico", "Health & Fitness Goals", "Personal and Behaviour Goals"),
    ("Personal y comportamiento", "Personal and Behaviour Goals", "Unquestionable Standards"),
]:
    grupos[nombre] = lista_numerada(p15.split(desde)[1].split(hasta)[0])
estandares = lista_numerada(p15.split("Unquestionable Standards")[1])

# ── Afirmaciones (p17-p24) ──────────────────────────────────────────────
texto_af = ""
for t in pag[16:24]:
    t = t.replace("NICOLAS CADENA AFFIRMATIONS", "").replace("Articulate -> Paint a clear and detailed vision/image -> Feel emotion", "")
    texto_af += "\n" + t
texto_af = texto_af.replace("OUTWORK\nEVERYONE", "")
secciones_af = []
for m in re.finditer(r"(?m)^\s*(\d+)\s·\s(.+)$", texto_af):
    secciones_af.append((m.start(), m.end(), m.group(1), m.group(2).strip()))
afirmaciones = []
for i, (ini, fin, n, titulo) in enumerate(secciones_af):
    cuerpo = texto_af[fin: secciones_af[i + 1][0] if i + 1 < len(secciones_af) else len(texto_af)]
    cuerpo = " ".join(cuerpo.split())
    frases = re.findall(r".+?Me siento[^.]*\.", cuerpo)
    resto = cuerpo
    for f in frases:
        resto = resto.replace(f, "", 1)
    if resto.strip():
        frases.append(resto.strip())
    afirmaciones.append({"n": int(n), "titulo": titulo, "frases": [f.strip() for f in frases if f.strip()]})

# ── Imágenes: portada, visión, legado e historia ───────────────────────
imagenes = []
for i, nombre in [(0, "Portada"), (4, "Visión 1"), (5, "Visión 2"), (6, "Visión 3"), (7, "Legado 1"), (8, "Legado 2"), (9, "Legado 3"), (10, "Historia · capítulos pasados"), (11, "Historia · capítulos futuros")]:
    pix = pdf[i].get_pixmap(dpi=62)
    b = pix.tobytes("jpeg", jpg_quality=66)
    imagenes.append({"id": f"img-p{i + 1:02d}", "nombre": nombre, "data": "data:image/jpeg;base64," + base64.b64encode(b).decode()})

documento = {
    "titulo": lineas(pag[0])[0] if lineas(pag[0]) else "Self Transcendence Workbook",
    "version": "1.1",
    "creado": "2026-08-23",
    "instrucciones": " ".join(lineas(pag[1].split("Instructions:")[1].split("Date created")[0])),
    "principios": principios,
    "ritual": ritual,
    "vision": " ".join(lineas(pag[4])[1:]),
    "legado": " ".join(lineas(pag[7])[1:]),
    "historia": {
        "lema": "Decided to be successful and founded a multimillion-dollar agency despite his circumstances, becoming one of the pioneers in Colombia, Nicolas Cadena's story is an example of exponential personal growth.",
        "pasados": ["Lost without a purpose", "Started dropshipping, unconsistent results", "Burnout, unfocused", "Started Imperium Academy & changed my life", "Founded Olimpo", "Bought VIP - Imperium Acquisition Client"],
        "futuros": ["First Client", "+1000 calls", "Personal Brand +10k", "+100 sales calls", "10 clients", "Scale Agency to $10k/MO", "Hire a team", "Automate Agency", "Travel & be free", "Move to Bali", "Buy BMW", "$50k/MO", "?", "?", "?", "?"],
    },
    "manifiesto": manifiesto,
    "rasgos": rasgos,
    "estilo": estilo,
    "rutina": rutina,
    "estandar_rutina": estandar_rutina,
    "mentores": mentores,
    "metas": grupos,
    "estandares": estandares,
    "recordatorio": "«If you just read them, it won't work.» Pensamiento + Imagen + Emoción = Creencia. 👏 Clap cue 👏",
    "afirmaciones": afirmaciones,
    "cierre": "OUTWORK EVERYONE",
}

# ── Respuestas a los ejercicios (.docx llenados) ───────────────────────
def parrafos(nombre):
    d = docx.Document(SUPL / nombre)
    return [p.text.strip() for p in d.paragraphs if p.text.strip()]


respuestas = {}
try:
    ps = parrafos("Why Are You Not Successful Yet_.docx")
    razones, i = [], 0
    while i < len(ps):
        if re.match(r"Reason \d+", ps[i]) and i + 1 < len(ps) and not re.match(r"Reason \d+", ps[i + 1]):
            razones.append(ps[i + 1])
            i += 2
        else:
            i += 1
    respuestas["2.3-razones"] = "\n".join(f"{n}. {r}" for n, r in enumerate(razones, 1))
except Exception as e:  # noqa: BLE001
    print("sin razones:", e)

try:
    ps = parrafos("Defining Your Primary Forms of Resistance.docx")
    i = ps.index(next(p for p in ps if p.startswith("Nico’s Primary Resistance Forms") or p.startswith("Nico's Primary Resistance Forms")))
    respuestas["2.5-resistencia"] = "\n\n".join(ps[i + 1:])
    respuestas["_formas_primarias"] = [x.strip() for x in ps[i + 1].split(",")]
except Exception as e:  # noqa: BLE001
    print("sin resistencia:", e)

try:
    ps = parrafos("Personal Sacrifice Audit.docx")
    t = "\n".join(ps)
    t = t.split("Scared? Anxious?")[0]
    t = re.sub(r"^.*?List everything below you’re going to sacrifice for the pursuit of your goal\.\n", "Lo que voy a sacrificar:\n", t, flags=re.S)
    t = t.replace("Now write out the one you really don’t want to list (the big bad scary one you REALLY do not want to get rid of).", "\nEl jefe final:")
    t = t.replace("Now write down what action items you’re going to take TODAY to start the sacrifices:", "\nAcciones de HOY:")
    t = t.replace("What drastic action are you going to take to get rid of the ‘final boss sacrifice’?", "\nLa acción drástica:")
    respuestas["2.7-sacrificio"] = t.strip()
except Exception as e:  # noqa: BLE001
    print("sin sacrificio:", e)

salida = {**doctrina, "documento": documento, "imagenes": imagenes, "respuestas": respuestas, "generado": "scripts/generar-semana-2.py"}
destino = RAIZ / "public" / "privado" / "semana-2.json"
destino.parent.mkdir(parents=True, exist_ok=True)
destino.write_text(json.dumps(salida, ensure_ascii=False), encoding="utf-8")
print("OK", destino, f"{destino.stat().st_size / 1024:.0f} KB")
print("principios", len(principios), "· ritual", len(ritual), "· rasgos", len(rasgos), "· rutina", len(rutina))
print("metas", {k: len(v) for k, v in grupos.items()}, "· estándares", len(estandares))
print("afirmaciones", [(a["n"], len(a["frases"])) for a in afirmaciones])
print("respuestas", list(respuestas))
