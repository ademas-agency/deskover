# Les Carnets de Thomas — Le Pavillon des Canaux, Paris 19e

**Date** : Mercredi 16 avril 2026, 12h30
**Pilier** : Les Carnets
**Voix** : Thomas
**Format** : Reel montage 5 photos
**Lieu** : Le Pavillon des Canaux — 39 Quai de la Loire, Paris 19e

## Photos

1. L'extérieur : petite maison au bord du canal de l'Ourcq, façade colorée
2. L'intérieur : chaque pièce est décorée différemment (chambre, salon, salle de bain avec baignoire-canapé)
3. Le détail : la baignoire transformée en banquette dans la "salle de bain"
4. Le setup : ordi posé sur le lit dans la "chambre", ambiance maison
5. Le café : tasse sur une table de chevet, vue sur le canal par la fenêtre

## Prompt IA

```
Shot on Fujifilm X100VI, 23mm f/2 lens, natural light only. Film simulation: Classic Negative. Slightly warm color grading, desaturated greens, rich skin tones, soft grain. Editorial lifestyle photography. 4:5 portrait ratio (1080x1350). Photorealistic.

Interior of Le Pavillon des Canaux, Paris 19th. A house converted into a café where each room has a different domestic theme. This room looks like a cozy bedroom: a bed with cushions where people sit and work, bedside tables, warm lighting, wallpaper. But it's a café. People are drinking coffee and working on computers, sitting on the bed. Surreal, intimate, playful atmosphere. Canal view through the window.
```

## Texte overlay

- "Mardi aprèm, Paris 19e." Plus Jakarta 11px blanc italic
- "— T." Plus Jakarta 9px blanc 50%

## Caption

Mardi aprèm, Paris 19e.

Le Pavillon des Canaux, c'est une maison. Littéralement. Tu entres, il y a une chambre avec un lit (oui, tu peux t'y installer pour bosser), une salle de bain avec une baignoire transformée en canapé, un salon avec une cheminée. Et tout ça, c'est un café.

C'est le genre d'endroit que tu ne trouves nulle part ailleurs. Tu bosses assis sur un lit avec vue sur le canal de l'Ourcq et tu te demandes pourquoi tous les cafés ne sont pas comme ça.

— T.

## Hashtags

#oùtravailler #télétravail #remotework #freelancefrance #deskover #pavillondescanaux #paris19 #canaldelourcq #coffeeshopparis #bosseraucafé #cafépourtravailler #lieuinsolite #pariscafé #coffeeshopfrance #bureauxnomades

## Musique

"indie morning" — volume 25%

## Stories

- Photo canal + "Le spot le plus dingue de Paris ?"
- Photo baignoire-canapé + "Oui, c'est un café"

---

## Montage vidéo (ffmpeg)

Une fois les 5 photos générées/prises, les placer dans ce dossier avec ces noms :
- `01-plafond.jpg` (ou `01-devanture.jpg` selon le lieu)
- `02-interieur.jpg`
- `03-detail.jpg`
- `04-setup.jpg`
- `05-cafe.jpg`

Format requis : 1080x1350 (4:5 portrait). Si les photos sont dans un autre format, les recadrer avant.

Puis me dire : "Génère le montage pour [nom du lieu]" et je lancerai ffmpeg avec :
- Chaque photo affichée 0.8s
- Fondu enchaîné 0.3s entre chaque
- Texte overlay fixe (nom du lieu + ville + "— T.")
- Durée totale ~5s, en boucle
- Export MP4 1080x1350, prêt à poster comme Reel

Si tu veux ajouter de la musique, place aussi un fichier `musique.mp3` dans le dossier.
