# Ajoute aux pouvoirs « serviteurs » du référentiel un profil structuré (type, genre, nombre,
# caractéristiques, talents, pouvoirs), lu dans la phrase « Profil : … » de leur résumé.
# Usage : python -I scripts/profils-serviteurs.py ../pack
import io, json, os, re, sys

TYPES = {
    'Morts-vivants': 'Mort-vivant',
    'Familier animalier': 'Animal',
    'Familier humanoïde': 'Humain',
    "Familier sous forme d'objet": 'Objet',
}
GENRE = {'zombies': 'Zombie', 'squelettes': 'Squelette', 'goules': 'Goule'}
NOMBRE = {'zombies': '3d6', 'squelettes': '2d6', 'goules': '1d6'}
CLES = {'FO': 'fo', 'VO': 'vo', 'PE': 'pe', 'AG': 'ag', 'PR': 'pr', 'AP': 'ap', 'PP': 'pp'}


def liste(texte):
    """« Esquive, Corps à corps (1), Discrétion (2) » → niveaux ; un élément sans niveau prend celui qui suit."""
    items = [t.strip() for t in texte.split(',') if t.strip()]
    out, attente = [], []
    for it in items:
        m = re.match(r'^(.*?)\s*\((\d+)\)$', it)
        if m:
            for a in attente:
                out.append({'nom': a[0].upper() + a[1:], 'niveau': int(m.group(2))})
            attente = []
            out.append({'nom': m.group(1)[0].upper() + m.group(1)[1:], 'niveau': int(m.group(2))})
        else:
            attente.append(it)
    for a in attente:
        out.append({'nom': a[0].upper() + a[1:], 'niveau': ''})
    return out


dossier = sys.argv[1]
total = 0
for nom in sorted(os.listdir(dossier)):
    if not (nom.startswith('pouvoirs-') and nom.endswith('.json')):
        continue
    chemin = os.path.join(dossier, nom)
    data = json.load(io.open(chemin, encoding='utf-8'))
    modifie = False
    for p in data:
        type_ = TYPES.get(p.get('rubrique'))
        if not type_:
            continue
        m = re.search(r'Profil[^:]*:\s*(.*)$', p.get('resume', ''))
        if not m:
            print('  ! pas de profil :', p['id'])
            continue
        parties = [x.strip().rstrip('.') for x in m.group(1).split(' ; ')]
        caracs = {CLES[k]: int(v) for k, v in re.findall(r'\b(FO|VO|PE|AG|PR|AP|PP)\s+(\d+)', parties[0])}
        p['serviteur'] = {
            'type': type_,
            'genre': GENRE.get(p['id'], p['nom']),
            'nombre': NOMBRE.get(p['id'], '1'),
            'caracs': caracs,
            'talents': liste(parties[1]) if len(parties) > 1 else [],
            'pouvoirs': liste(parties[2]) if len(parties) > 2 else [],
        }
        modifie = True
        total += 1
    if modifie:
        io.open(chemin, 'w', encoding='utf-8', newline='\n').write(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print(total, 'profils de serviteurs ajoutés')
