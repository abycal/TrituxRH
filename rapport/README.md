# Rapport PFE (LaTeX)

Le rapport est maintenant aligne sur le template IPLeiria present dans `TemplateLatex/`.

## Fichier principal
- `TemplateLatex/IPLeiriaMain.tex` : point d'entree principal du rapport

## Contenu personnalise
- `TemplateLatex/Metadata/Metadata.tex` : informations auteur, encadrement, titre
- `TemplateLatex/Chapters/00-Abstract.tex` : resume et abstract
- `TemplateLatex/Chapters/01-Introduction.tex` : chapitre 1 (etude prealable)
- `TemplateLatex/Chapters/02-User-Guide.tex` : chapitre 2 (analyse des besoins)
- `TemplateLatex/Matter/03-Acknowledgements.tex` : remerciements et dedicace
- `TemplateLatex/Matter/05-Glossary.tex` : glossaire
- `TemplateLatex/Matter/06-Acronyms.tex` : abreviations

## Compiler (PDF)
Depuis le dossier `rapport/TemplateLatex`, lancez :

```bash
xelatex IPLeiriaMain.tex
biber IPLeiriaMain
xelatex IPLeiriaMain.tex
xelatex IPLeiriaMain.tex
```

Alternative (si `latexmk` est installe) :

```bash
latexmk -xelatex -interaction=nonstopmode IPLeiriaMain.tex
```

## Visualiser dans VS Code
1. Installer l'extension `LaTeX Workshop`.
2. Ouvrir `TemplateLatex/IPLeiriaMain.tex`.
3. Utiliser `Ctrl+Alt+B` pour compiler.
4. Ouvrir l'apercu PDF avec la commande `LaTeX Workshop: View LaTeX PDF`.
