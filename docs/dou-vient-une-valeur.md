# D'où vient une valeur, et depuis quand on le sait

**À quoi sert cette page :** deux gênes notées au carnet se ressemblaient assez
pour être traitées ensemble — la trace d'un verdict ne disait pas d'où venait ce
qu'elle avait lu, et rien ne disait sur quel projet on répondait. Les deux
mentent de la même façon : par omission, avec l'air d'être complètes.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Le défaut : quatre choses qui se relisaient pareil

La trace disait :

```
Nature des volets = bois     alu     faux
```

`alu` pouvait venir de **quatre** endroits :

- le **projet**, pour la zone où l'on se place ;
- une **ligne du brouillon** — un `.ddb`, une affirmation posée ;
- la **réponse** qu'on vient de taper dans le champ juste au-dessus ;
- une **autre fonction** de l'essai, qui vient de le conclure au tour d'avant.

Quatre endroits où aller corriger, et rien pour les séparer. On allait changer
le projet pour défaire une réponse tapée, ou retaper un champ pour corriger une
fonction.

Le rappel sous le champ — le trait à gauche, « du projet » — disait déjà une
partie de cela (`docs/le-troisieme-etat-dun-champ.md`). Il ne descendait pas
jusqu'au **verdict**, c'est-à-dire là où l'on lit vraiment ce que la fonction a
fait.

## Ce qu'on voit maintenant

```
Couleur des volets   conclut   gris
  Nature des volets = bois      alu    projet      faux
  Hauteur de reference > 5      9 m    brouillon   vrai

Teinte finale        conclut   ivoire
  Couleur des volets = gris     gris   déduit      vrai
  Exposition = sud              sud    réponse     vrai
```

Un mot, à côté de ce qui a été lu. Il dit **où aller** : au projet, dans le
fichier, dans le champ, ou dans la fonction d'à côté.

**La pastille est calibrée une fois**, sans préfixe d'écran (`.venue`). Une
pastille par écran aurait fini par dire « du projet » de quatre façons — c'est
exactement ce qu'on a passé des rondes à défaire ailleurs.

## Pourquoi la provenance se construit avec la valeur

Trois sources, et l'ordre compte : le projet d'abord, le brouillon par-dessus,
la réponse tapée en dernier. **La provenance _est_ cet ordre.** La calculer
ailleurs reviendrait à réécrire le même empilement une seconde fois, et le jour
où l'une des trois sources bougerait, l'autre copie continuerait de dire
l'ancien (règle 4).

`ceQuOnDonneAuLancement` rend donc les deux d'un seul tenant :

```js
const { valeurs, venues } = ceQuOnDonneAuLancement(fichiers, reponses, { memoire, zone });
```

`valeursDuLancement` n'est plus qu'une lecture de la première moitié : les
appelants d'avant n'ont rien à changer, et il n'y a toujours qu'un empilement.

La quatrième provenance, `déduit`, s'inscrit là où la conclusion entre : la
passe qui reverse ce qu'une fonction vient de conclure pose la valeur **et** sa
provenance au même moment.

## Ce qu'on ne dit pas

**Une lecture dont on ne sait pas d'où elle vient n'a pas de pastille.** Un
appel qui nomme un autre bâtiment, un nom que rien n'a donné au lancement :
écrire « du projet » là-dessus ferait chercher là où il n'y a rien à chercher
(règle 5). Le silence est la bonne réponse, et c'est le même silence que pour
une lecture qui n'a rien lu — ce qui n'a pas été donné au lancement n'y a pas de
provenance, et ce qui y en a une a été lu.

## La seconde gêne : on ne savait pas sur quel projet on répondait

La mémoire du projet se lisait **une fois par session**, à l'ouverture de
l'écran. On reprenait « 2,70 m », on corrigeait autre chose, on revenait une
demi-heure plus tard : si quelqu'un avait signé « 2,75 m » entre-temps, l'essai
continuait de répondre sur `2,70 m` avec exactement la même assurance.

**Une valeur périmée se lit comme une valeur juste.** C'est pire qu'une valeur
absente : une absence se voit.

L'écran dit maintenant, sous le sélecteur de zone :

```
Où l'on se place   [ Bâtiment A ▾ ]
Projet lu à 14:32  relire   Le projet a bougé depuis la lecture —
                            « Nature des volets » : alu → bois.
```

- **L'heure ne garantit rien** — le projet peut bouger la seconde suivante.
  Elle dit **sur quoi** on répond, et c'est ce qui manquait.
- **Relire est un geste**, pas une surveillance. Le bac n'écoute pas la base :
  il ne lit que lorsqu'on le lui demande, et ce qu'on a tapé reste.
- **Ce qui a bougé se nomme.** « Le projet a changé » n'apprend rien : ce qu'on
  veut savoir est s'il faut relancer, et cela se décide sur les noms.

## Ce qu'on compare, et ce qu'on ne compare pas

Deux mémoires diffèrent de mille façons qui ne regardent pas ce brouillon : une
autre zone, un autre sujet, un versement éclipsé. On compare donc ce que **ce
brouillon reprend**, dans **la zone où l'on se place** — en posant deux fois la
même question à `champsDuBrouillon`, avec l'ancienne mémoire puis la neuve. On
ne redécide rien de ce qu'une zone tient (règle 10).

Prévenir à chaque mouvement du projet ferait une phrase qu'on cesse de lire, et
celle qui compte passerait avec elle.

**Une valeur retirée du projet a bougé aussi**, et se dit autrement : « n'est
plus au projet (alu) », sans flèche. Le champ se vide, et un champ vide est
l'état ordinaire d'un formulaire — sans un mot, on retape ce que le projet vient
délibérément de retirer. Écrire « → rien » laisserait croire que le projet tient
« rien ».

**Une relecture qui échoue se dit.** On vient de la demander d'un clic, et un
clic sans effet ferait croire que le projet n'a pas bougé. Ce qu'on avait lu
reste en place : le jeter rendrait l'essai muet pour punir la base d'être
injoignable.

## Ce que cela déplace dans l'écran

Refaire le bac entier vivait à deux endroits — le changement de zone, et
l'arrivée de la mémoire, qui n'en reposait que les verdicts. Le formulaire
disait donc parfois autre chose que les résultats juste en dessous. Un seul
`refaireLeBac` les sert tous les trois maintenant, relecture comprise (règle 10).

**Sauf quand le bac _est_ l'écran.** L'essai d'un utilitaire le dessine sans
tête et sans mémoire : le refaire entier lui poserait un titre et un sélecteur
de zone que son premier rendu n'a jamais eus. On y repose les seuls verdicts,
comme avant.

## Ce que cela ne change pas

**Rien n'entre dans la mémoire.** Le bac lit le projet, il n'y écrit pas — et
relire n'est qu'une seconde lecture. La seule porte reste la proposition signée
(règle 1).

**Rien de ce que l'essai calcule.** La provenance accompagne la valeur, elle ne
la choisit pas : l'ordre des trois sources est celui d'avant, au caractère près.
