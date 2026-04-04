# Les Carnets de Thomas — Anticafé, Strasbourg

**Date** : Lundi 28 avril 2026, 8h30
**Pilier** : Les Carnets
**Voix** : Thomas
**Format** : Reel montage 5 photos
**Lieu** : Coworking Anticafé — 1 Rue de la Division Leclerc, Strasbourg

## Photos

1. Vue large : la salle principale, grandes tables, ambiance studieuse
2. Un coin canapé ou fauteuil, plus cosy
3. Détail : la bibliothèque partagée, ou un détail de déco alsacien
4. Setup : ordi + thé + carnet sur une grande table
5. Boisson : thé ou infusion (pas que du café, c'est un anticafé)

## Prompt IA

```
Shot on Fujifilm X100VI, 23mm f/2 lens, natural light only. Film simulation: Classic Negative. Slightly warm color grading, desaturated greens, rich skin tones, soft grain. Editorial lifestyle photography. 4:5 portrait ratio (1080x1350). Photorealistic.

Interior of Anticafé Strasbourg, a pay-by-the-hour coworking café. A bright open space with large communal tables, bookshelves, comfortable armchairs in a corner. The décor mixes modern Scandinavian with subtle Alsatian touches. People working quietly, some with headphones. A shared bookshelf. Tea and coffee self-service station. Natural light, calm atmosphere. Very studious, library-like.
```

## Texte overlay

- "Jeudi aprèm, Strasbourg." Plus Jakarta 11px blanc italic
- "— T." Plus Jakarta 9px blanc 50%

## Caption

Jeudi aprèm, Strasbourg.

L'Anticafé ici, c'est pas le même feeling qu'à Paris. C'est plus calme, plus studieux, presque monacal. Tu te sers en thé (illimité), tu t'installes, et le monde extérieur disparaît.

J'ai bossé 4 heures d'affilée sans lever la tête. La lumière avait changé quand j'ai regardé par la fenêtre. C'est le signe d'un bon spot.

Strasbourg, on t'avait sous-estimé.

— T.

## Hashtags

#oùtravailler #télétravail #remotework #freelancefrance #deskover #strasbourg #coworkingstrasbourg #anticafé #strasbourgcity #bosseraucafé #cafépourtravailler #alsace #coffeeshopfrance #coworkingfrance #bureauxnomades

## Musique

"ambient study" — volume 20%

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
