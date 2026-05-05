-- Correctif d'encodage des noms de cantons 2014 depuis france2014.dbf (décodage CP850).
-- Met à jour les libellés, la version normalisée et le source_payload pour les cantons concernés.
BEGIN;

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bar-sur-Aube',
    canton_name_2014_normalized = 'bar sur aube',
    department_code = '10',
    source_payload = '{"canton_code_2014":"1003","canton_name_2014":"Bar-sur-Aube"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1003';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Méry-sur-Seine',
    canton_name_2014_normalized = 'mery sur seine',
    department_code = '10',
    source_payload = '{"canton_code_2014":"1014","canton_name_2014":"Méry-sur-Seine"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1014';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Nogent-sur-Seine',
    canton_name_2014_normalized = 'nogent sur seine',
    department_code = '10',
    source_payload = '{"canton_code_2014":"1016","canton_name_2014":"Nogent-sur-Seine"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1016';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Romilly-sur-Seine  1er Canton',
    canton_name_2014_normalized = 'romilly sur seine 1er canton',
    department_code = '10',
    source_payload = '{"canton_code_2014":"1020","canton_name_2014":"Romilly-sur-Seine  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1020';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Troyes  1er Canton',
    canton_name_2014_normalized = 'troyes 1er canton',
    department_code = '10',
    source_payload = '{"canton_code_2014":"1022","canton_name_2014":"Troyes  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1022';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Troyes  2e  Canton',
    canton_name_2014_normalized = 'troyes 2e canton',
    department_code = '10',
    source_payload = '{"canton_code_2014":"1023","canton_name_2014":"Troyes  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1023';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Troyes  4e  Canton',
    canton_name_2014_normalized = 'troyes 4e canton',
    department_code = '10',
    source_payload = '{"canton_code_2014":"1029","canton_name_2014":"Troyes  4e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1029';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Troyes  6e  Canton',
    canton_name_2014_normalized = 'troyes 6e canton',
    department_code = '10',
    source_payload = '{"canton_code_2014":"1031","canton_name_2014":"Troyes  6e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1031';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Troyes  7e  Canton',
    canton_name_2014_normalized = 'troyes 7e canton',
    department_code = '10',
    source_payload = '{"canton_code_2014":"1032","canton_name_2014":"Troyes  7e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1032';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chapelle-Saint-Luc',
    canton_name_2014_normalized = 'chapelle saint luc',
    department_code = '10',
    source_payload = '{"canton_code_2014":"1033","canton_name_2014":"Chapelle-Saint-Luc"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1033';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '10',
    source_payload = '{"canton_code_2014":"1096","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1096';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '10',
    source_payload = '{"canton_code_2014":"1097","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1097';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '10',
    source_payload = '{"canton_code_2014":"1099","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1099';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Carcassonne  1er Canton',
    canton_name_2014_normalized = 'carcassonne 1er canton',
    department_code = '11',
    source_payload = '{"canton_code_2014":"1107","canton_name_2014":"Carcassonne  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1107';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Carcassonne  2e  Canton-Nord',
    canton_name_2014_normalized = 'carcassonne 2e canton nord',
    department_code = '11',
    source_payload = '{"canton_code_2014":"1108","canton_name_2014":"Carcassonne  2e  Canton-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1108';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Castelnaudary-Nord',
    canton_name_2014_normalized = 'castelnaudary nord',
    department_code = '11',
    source_payload = '{"canton_code_2014":"1109","canton_name_2014":"Castelnaudary-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1109';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Castelnaudary-Sud',
    canton_name_2014_normalized = 'castelnaudary sud',
    department_code = '11',
    source_payload = '{"canton_code_2014":"1110","canton_name_2014":"Castelnaudary-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1110';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Durban-Corbières',
    canton_name_2014_normalized = 'durban corbieres',
    department_code = '11',
    source_payload = '{"canton_code_2014":"1115","canton_name_2014":"Durban-Corbières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1115';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Limoux',
    canton_name_2014_normalized = 'limoux',
    department_code = '11',
    source_payload = '{"canton_code_2014":"1120","canton_name_2014":"Limoux"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1120';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Narbonne-Ouest',
    canton_name_2014_normalized = 'narbonne ouest',
    department_code = '11',
    source_payload = '{"canton_code_2014":"1133","canton_name_2014":"Narbonne-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1133';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Narbonne-Sud',
    canton_name_2014_normalized = 'narbonne sud',
    department_code = '11',
    source_payload = '{"canton_code_2014":"1134","canton_name_2014":"Narbonne-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1134';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '11',
    source_payload = '{"canton_code_2014":"1197","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1197';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '11',
    source_payload = '{"canton_code_2014":"1198","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1198';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '11',
    source_payload = '{"canton_code_2014":"1199","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1199';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Millau-Est',
    canton_name_2014_normalized = 'millau est',
    department_code = '12',
    source_payload = '{"canton_code_2014":"1217","canton_name_2014":"Millau-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1217';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rodez-Est',
    canton_name_2014_normalized = 'rodez est',
    department_code = '12',
    source_payload = '{"canton_code_2014":"1228","canton_name_2014":"Rodez-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1228';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Salvetat-Peyralès',
    canton_name_2014_normalized = 'salvetat peyrales',
    department_code = '12',
    source_payload = '{"canton_code_2014":"1238","canton_name_2014":"Salvetat-Peyralès"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1238';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Baraqueville-Sauveterre',
    canton_name_2014_normalized = 'baraqueville sauveterre',
    department_code = '12',
    source_payload = '{"canton_code_2014":"1239","canton_name_2014":"Baraqueville-Sauveterre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1239';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sévérac-le-Château',
    canton_name_2014_normalized = 'severac le chateau',
    department_code = '12',
    source_payload = '{"canton_code_2014":"1240","canton_name_2014":"Sévérac-le-Château"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1240';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Villefranche-de-Rouergue',
    canton_name_2014_normalized = 'villefranche de rouergue',
    department_code = '12',
    source_payload = '{"canton_code_2014":"1242","canton_name_2014":"Villefranche-de-Rouergue"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1242';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Millau-Ouest',
    canton_name_2014_normalized = 'millau ouest',
    department_code = '12',
    source_payload = '{"canton_code_2014":"1244","canton_name_2014":"Millau-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1244';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rodez-Ouest',
    canton_name_2014_normalized = 'rodez ouest',
    department_code = '12',
    source_payload = '{"canton_code_2014":"1245","canton_name_2014":"Rodez-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1245';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rodez-Nord',
    canton_name_2014_normalized = 'rodez nord',
    department_code = '12',
    source_payload = '{"canton_code_2014":"1246","canton_name_2014":"Rodez-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1246';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '12',
    source_payload = '{"canton_code_2014":"1297","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1297';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '12',
    source_payload = '{"canton_code_2014":"1298","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1298';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Aix-en-Provence-Nord-Est',
    canton_name_2014_normalized = 'aix en provence nord est',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1301","canton_name_2014":"Aix-en-Provence-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1301';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Aix-en-Provence-Sud-Ouest',
    canton_name_2014_normalized = 'aix en provence sud ouest',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1302","canton_name_2014":"Aix-en-Provence-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1302';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Arles-Est',
    canton_name_2014_normalized = 'arles est',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1303","canton_name_2014":"Arles-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1303';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Aubagne-Ouest',
    canton_name_2014_normalized = 'aubagne ouest',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1305","canton_name_2014":"Aubagne-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1305';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Berre-l''Étang',
    canton_name_2014_normalized = 'berre l etang',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1306","canton_name_2014":"Berre-l''Étang"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1306';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteaurenard',
    canton_name_2014_normalized = 'chateaurenard',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1307","canton_name_2014":"Châteaurenard"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1307';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Istres-Nord',
    canton_name_2014_normalized = 'istres nord',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1311","canton_name_2014":"Istres-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1311';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteauneuf-Côte-Bleue',
    canton_name_2014_normalized = 'chateauneuf cote bleue',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1348","canton_name_2014":"Châteauneuf-Côte-Bleue"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1348';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Istres-Sud',
    canton_name_2014_normalized = 'istres sud',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1349","canton_name_2014":"Istres-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1349';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Martigues-Ouest',
    canton_name_2014_normalized = 'martigues ouest',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1350","canton_name_2014":"Martigues-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1350';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Aubagne-Est',
    canton_name_2014_normalized = 'aubagne est',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1354","canton_name_2014":"Aubagne-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1354';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1394","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1394';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1395","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1395';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1396","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1396';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1397","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1397';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1398","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1398';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '13',
    source_payload = '{"canton_code_2014":"1399","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1399';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bayeux',
    canton_name_2014_normalized = 'bayeux',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1403","canton_name_2014":"Bayeux"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1403';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Caen  1er Canton',
    canton_name_2014_normalized = 'caen 1er canton',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1408","canton_name_2014":"Caen  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1408';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Caen  2e  Canton',
    canton_name_2014_normalized = 'caen 2e canton',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1409","canton_name_2014":"Caen  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1409';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Caumont-l''Éventé',
    canton_name_2014_normalized = 'caumont l evente',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1411","canton_name_2014":"Caumont-l''Éventé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1411';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Douvres-la-Délivrande',
    canton_name_2014_normalized = 'douvres la delivrande',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1414","canton_name_2014":"Douvres-la-Délivrande"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1414';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Évrecy',
    canton_name_2014_normalized = 'evrecy',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1416","canton_name_2014":"Évrecy"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1416';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Falaise-Nord',
    canton_name_2014_normalized = 'falaise nord',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1417","canton_name_2014":"Falaise-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1417';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Falaise-Sud',
    canton_name_2014_normalized = 'falaise sud',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1418","canton_name_2014":"Falaise-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1418';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lisieux  1er Canton',
    canton_name_2014_normalized = 'lisieux 1er canton',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1421","canton_name_2014":"Lisieux  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1421';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lisieux  2e  Canton',
    canton_name_2014_normalized = 'lisieux 2e canton',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1422","canton_name_2014":"Lisieux  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1422';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pont-l''Évêque',
    canton_name_2014_normalized = 'pont l eveque',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1427","canton_name_2014":"Pont-l''Évêque"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1427';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vire',
    canton_name_2014_normalized = 'vire',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1438","canton_name_2014":"Vire"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1438';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Caen  4e  Canton',
    canton_name_2014_normalized = 'caen 4e canton',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1440","canton_name_2014":"Caen  4e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1440';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Caen  7e  Canton',
    canton_name_2014_normalized = 'caen 7e canton',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1443","canton_name_2014":"Caen  7e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1443';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Caen  8e  Canton',
    canton_name_2014_normalized = 'caen 8e canton',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1444","canton_name_2014":"Caen  8e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1444';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Caen 10e  Canton',
    canton_name_2014_normalized = 'caen 10e canton',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1446","canton_name_2014":"Caen 10e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1446';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lisieux  3e  Canton',
    canton_name_2014_normalized = 'lisieux 3e canton',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1449","canton_name_2014":"Lisieux  3e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1449';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1493","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1493';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1497","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1497';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1498","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1498';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '14',
    source_payload = '{"canton_code_2014":"1499","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1499';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Aurillac  2e  Canton',
    canton_name_2014_normalized = 'aurillac 2e canton',
    department_code = '15',
    source_payload = '{"canton_code_2014":"1503","canton_name_2014":"Aurillac  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1503';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mauriac',
    canton_name_2014_normalized = 'mauriac',
    department_code = '15',
    source_payload = '{"canton_code_2014":"1509","canton_name_2014":"Mauriac"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1509';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Flour-Nord',
    canton_name_2014_normalized = 'saint flour nord',
    department_code = '15',
    source_payload = '{"canton_code_2014":"1519","canton_name_2014":"Saint-Flour-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1519';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Flour-Sud',
    canton_name_2014_normalized = 'saint flour sud',
    department_code = '15',
    source_payload = '{"canton_code_2014":"1520","canton_name_2014":"Saint-Flour-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1520';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vic-sur-Cère',
    canton_name_2014_normalized = 'vic sur cere',
    department_code = '15',
    source_payload = '{"canton_code_2014":"1523","canton_name_2014":"Vic-sur-Cère"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1523';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Aurillac  4e  Canton',
    canton_name_2014_normalized = 'aurillac 4e canton',
    department_code = '15',
    source_payload = '{"canton_code_2014":"1525","canton_name_2014":"Aurillac  4e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1525';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Arpajon-sur-Cère',
    canton_name_2014_normalized = 'arpajon sur cere',
    department_code = '15',
    source_payload = '{"canton_code_2014":"1526","canton_name_2014":"Arpajon-sur-Cère"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1526';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '15',
    source_payload = '{"canton_code_2014":"1598","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1598';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '15',
    source_payload = '{"canton_code_2014":"1599","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1599';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cognac-Nord',
    canton_name_2014_normalized = 'cognac nord',
    department_code = '16',
    source_payload = '{"canton_code_2014":"1613","canton_name_2014":"Cognac-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1613';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Confolens-Nord',
    canton_name_2014_normalized = 'confolens nord',
    department_code = '16',
    source_payload = '{"canton_code_2014":"1614","canton_name_2014":"Confolens-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1614';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Confolens-Sud',
    canton_name_2014_normalized = 'confolens sud',
    department_code = '16',
    source_payload = '{"canton_code_2014":"1615","canton_name_2014":"Confolens-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1615';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cognac-Sud',
    canton_name_2014_normalized = 'cognac sud',
    department_code = '16',
    source_payload = '{"canton_code_2014":"1633","canton_name_2014":"Cognac-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1633';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '16',
    source_payload = '{"canton_code_2014":"1697","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1697';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '16',
    source_payload = '{"canton_code_2014":"1698","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1698';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '16',
    source_payload = '{"canton_code_2014":"1699","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1699';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Château-d''Oléron',
    canton_name_2014_normalized = 'chateau d oleron',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1706","canton_name_2014":"Château-d''Oléron"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1706';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Courçon',
    canton_name_2014_normalized = 'courcon',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1707","canton_name_2014":"Courçon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1707';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Jonzac',
    canton_name_2014_normalized = 'jonzac',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1711","canton_name_2014":"Jonzac"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1711';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rochefort-Nord',
    canton_name_2014_normalized = 'rochefort nord',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1721","canton_name_2014":"Rochefort-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1721';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Royan-Est',
    canton_name_2014_normalized = 'royan est',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1725","canton_name_2014":"Royan-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1725';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Jean-d''Angély',
    canton_name_2014_normalized = 'saint jean d angely',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1729","canton_name_2014":"Saint-Jean-d''Angély"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1729';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Martin-de-Ré',
    canton_name_2014_normalized = 'saint martin de re',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1730","canton_name_2014":"Saint-Martin-de-Ré"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1730';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Pierre-d''Oléron',
    canton_name_2014_normalized = 'saint pierre d oleron',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1731","canton_name_2014":"Saint-Pierre-d''Oléron"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1731';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saintes-Nord',
    canton_name_2014_normalized = 'saintes nord',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1734","canton_name_2014":"Saintes-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1734';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saintes-Ouest',
    canton_name_2014_normalized = 'saintes ouest',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1735","canton_name_2014":"Saintes-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1735';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Royan-Ouest',
    canton_name_2014_normalized = 'royan ouest',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1743","canton_name_2014":"Royan-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1743';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rochelle  5e  Canton',
    canton_name_2014_normalized = 'rochelle 5e canton',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1744","canton_name_2014":"Rochelle  5e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1744';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rochelle  8e  Canton',
    canton_name_2014_normalized = 'rochelle 8e canton',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1749","canton_name_2014":"Rochelle  8e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1749';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rochelle  9e  Canton',
    canton_name_2014_normalized = 'rochelle 9e canton',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1750","canton_name_2014":"Rochelle  9e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1750';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saintes-Est',
    canton_name_2014_normalized = 'saintes est',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1751","canton_name_2014":"Saintes-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1751';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1796","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1796';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1797","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1797';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1798","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1798';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '17',
    source_payload = '{"canton_code_2014":"1799","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1799';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Aubigny-sur-Nère',
    canton_name_2014_normalized = 'aubigny sur nere',
    department_code = '18',
    source_payload = '{"canton_code_2014":"1803","canton_name_2014":"Aubigny-sur-Nère"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1803';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteaumeillant',
    canton_name_2014_normalized = 'chateaumeillant',
    department_code = '18',
    source_payload = '{"canton_code_2014":"1809","canton_name_2014":"Châteaumeillant"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1809';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lignières',
    canton_name_2014_normalized = 'lignieres',
    department_code = '18',
    source_payload = '{"canton_code_2014":"1818","canton_name_2014":"Lignières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1818';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mehun-sur-Yèvre',
    canton_name_2014_normalized = 'mehun sur yevre',
    department_code = '18',
    source_payload = '{"canton_code_2014":"1820","canton_name_2014":"Mehun-sur-Yèvre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1820';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Amand-Montrond',
    canton_name_2014_normalized = 'saint amand montrond',
    department_code = '18',
    source_payload = '{"canton_code_2014":"1822","canton_name_2014":"Saint-Amand-Montrond"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1822';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vierzon  2e  Canton',
    canton_name_2014_normalized = 'vierzon 2e canton',
    department_code = '18',
    source_payload = '{"canton_code_2014":"1830","canton_name_2014":"Vierzon  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1830';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '18',
    source_payload = '{"canton_code_2014":"1898","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1898';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '18',
    source_payload = '{"canton_code_2014":"1899","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1899';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Corrèze',
    canton_name_2014_normalized = 'correze',
    department_code = '19',
    source_payload = '{"canton_code_2014":"1908","canton_name_2014":"Corrèze"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1908';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Égletons',
    canton_name_2014_normalized = 'egletons',
    department_code = '19',
    source_payload = '{"canton_code_2014":"1910","canton_name_2014":"Égletons"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1910';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ussel-Est',
    canton_name_2014_normalized = 'ussel est',
    department_code = '19',
    source_payload = '{"canton_code_2014":"1927","canton_name_2014":"Ussel-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1927';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Brive-la-Gaillarde-Sud-Est',
    canton_name_2014_normalized = 'brive la gaillarde sud est',
    department_code = '19',
    source_payload = '{"canton_code_2014":"1930","canton_name_2014":"Brive-la-Gaillarde-Sud-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1930';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Brive-la-Gaillarde-Sud-Ouest',
    canton_name_2014_normalized = 'brive la gaillarde sud ouest',
    department_code = '19',
    source_payload = '{"canton_code_2014":"1933","canton_name_2014":"Brive-la-Gaillarde-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1933';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Malemort-sur-Corrèze',
    canton_name_2014_normalized = 'malemort sur correze',
    department_code = '19',
    source_payload = '{"canton_code_2014":"1934","canton_name_2014":"Malemort-sur-Corrèze"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1934';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Tulle-Campagne-Nord',
    canton_name_2014_normalized = 'tulle campagne nord',
    department_code = '19',
    source_payload = '{"canton_code_2014":"1935","canton_name_2014":"Tulle-Campagne-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1935';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Tulle-Campagne-Sud',
    canton_name_2014_normalized = 'tulle campagne sud',
    department_code = '19',
    source_payload = '{"canton_code_2014":"1936","canton_name_2014":"Tulle-Campagne-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1936';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ussel-Ouest',
    canton_name_2014_normalized = 'ussel ouest',
    department_code = '19',
    source_payload = '{"canton_code_2014":"1937","canton_name_2014":"Ussel-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1937';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '19',
    source_payload = '{"canton_code_2014":"1997","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1997';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '19',
    source_payload = '{"canton_code_2014":"1998","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1998';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '19',
    source_payload = '{"canton_code_2014":"1999","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '1999';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Beaune-Nord',
    canton_name_2014_normalized = 'beaune nord',
    department_code = '21',
    source_payload = '{"canton_code_2014":"2105","canton_name_2014":"Beaune-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2105';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Beaune-Sud',
    canton_name_2014_normalized = 'beaune sud',
    department_code = '21',
    source_payload = '{"canton_code_2014":"2106","canton_name_2014":"Beaune-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2106';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dijon  1er Canton',
    canton_name_2014_normalized = 'dijon 1er canton',
    department_code = '21',
    source_payload = '{"canton_code_2014":"2109","canton_name_2014":"Dijon  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2109';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dijon  2e  Canton',
    canton_name_2014_normalized = 'dijon 2e canton',
    department_code = '21',
    source_payload = '{"canton_code_2014":"2110","canton_name_2014":"Dijon  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2110';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mirebeau-sur-Bèze',
    canton_name_2014_normalized = 'mirebeau sur beze',
    department_code = '21',
    source_payload = '{"canton_code_2014":"2120","canton_name_2014":"Mirebeau-sur-Bèze"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2120';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montbard',
    canton_name_2014_normalized = 'montbard',
    department_code = '21',
    source_payload = '{"canton_code_2014":"2121","canton_name_2014":"Montbard"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2121';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pontailler-sur-Saône',
    canton_name_2014_normalized = 'pontailler sur saone',
    department_code = '21',
    source_payload = '{"canton_code_2014":"2125","canton_name_2014":"Pontailler-sur-Saône"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2125';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Précy-sous-Thil',
    canton_name_2014_normalized = 'precy sous thil',
    department_code = '21',
    source_payload = '{"canton_code_2014":"2127","canton_name_2014":"Précy-sous-Thil"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2127';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chenôve',
    canton_name_2014_normalized = 'chenove',
    department_code = '21',
    source_payload = '{"canton_code_2014":"2138","canton_name_2014":"Chenôve"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2138';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dijon  5e  Canton',
    canton_name_2014_normalized = 'dijon 5e canton',
    department_code = '21',
    source_payload = '{"canton_code_2014":"2139","canton_name_2014":"Dijon  5e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2139';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fontaine-lès-Dijon',
    canton_name_2014_normalized = 'fontaine les dijon',
    department_code = '21',
    source_payload = '{"canton_code_2014":"2143","canton_name_2014":"Fontaine-lès-Dijon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2143';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '21',
    source_payload = '{"canton_code_2014":"2197","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2197';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '21',
    source_payload = '{"canton_code_2014":"2198","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2198';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '21',
    source_payload = '{"canton_code_2014":"2199","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2199';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bégard',
    canton_name_2014_normalized = 'begard',
    department_code = '22',
    source_payload = '{"canton_code_2014":"2201","canton_name_2014":"Bégard"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2201';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dinan-Est',
    canton_name_2014_normalized = 'dinan est',
    department_code = '22',
    source_payload = '{"canton_code_2014":"2211","canton_name_2014":"Dinan-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2211';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dinan-Ouest',
    canton_name_2014_normalized = 'dinan ouest',
    department_code = '22',
    source_payload = '{"canton_code_2014":"2212","canton_name_2014":"Dinan-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2212';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Étables-sur-Mer',
    canton_name_2014_normalized = 'etables sur mer',
    department_code = '22',
    source_payload = '{"canton_code_2014":"2213","canton_name_2014":"Étables-sur-Mer"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2213';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Évran',
    canton_name_2014_normalized = 'evran',
    department_code = '22',
    source_payload = '{"canton_code_2014":"2214","canton_name_2014":"Évran"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2214';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Guingamp',
    canton_name_2014_normalized = 'guingamp',
    department_code = '22',
    source_payload = '{"canton_code_2014":"2216","canton_name_2014":"Guingamp"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2216';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lannion',
    canton_name_2014_normalized = 'lannion',
    department_code = '22',
    source_payload = '{"canton_code_2014":"2219","canton_name_2014":"Lannion"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2219';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Plestin-les-Grèves',
    canton_name_2014_normalized = 'plestin les greves',
    department_code = '22',
    source_payload = '{"canton_code_2014":"2233","canton_name_2014":"Plestin-les-Grèves"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2233';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Nicolas-du-Pélem',
    canton_name_2014_normalized = 'saint nicolas du pelem',
    department_code = '22',
    source_payload = '{"canton_code_2014":"2246","canton_name_2014":"Saint-Nicolas-du-Pélem"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2246';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '22',
    source_payload = '{"canton_code_2014":"2298","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2298';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '22',
    source_payload = '{"canton_code_2014":"2299","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2299';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Aubusson',
    canton_name_2014_normalized = 'aubusson',
    department_code = '23',
    source_payload = '{"canton_code_2014":"2302","canton_name_2014":"Aubusson"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2302';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Évaux-les-Bains',
    canton_name_2014_normalized = 'evaux les bains',
    department_code = '23',
    source_payload = '{"canton_code_2014":"2315","canton_name_2014":"Évaux-les-Bains"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2315';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Guéret-Nord',
    canton_name_2014_normalized = 'gueret nord',
    department_code = '23',
    source_payload = '{"canton_code_2014":"2319","canton_name_2014":"Guéret-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2319';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Guéret-Sud-Est',
    canton_name_2014_normalized = 'gueret sud est',
    department_code = '23',
    source_payload = '{"canton_code_2014":"2326","canton_name_2014":"Guéret-Sud-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2326';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Guéret-Sud-Ouest',
    canton_name_2014_normalized = 'gueret sud ouest',
    department_code = '23',
    source_payload = '{"canton_code_2014":"2327","canton_name_2014":"Guéret-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2327';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '23',
    source_payload = '{"canton_code_2014":"2398","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2398';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Nontron',
    canton_name_2014_normalized = 'nontron',
    department_code = '24',
    source_payload = '{"canton_code_2014":"2426","canton_name_2014":"Nontron"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2426';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Pardoux-la-Rivière',
    canton_name_2014_normalized = 'saint pardoux la riviere',
    department_code = '24',
    source_payload = '{"canton_code_2014":"2433","canton_name_2014":"Saint-Pardoux-la-Rivière"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2433';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sarlat-la-Canéda',
    canton_name_2014_normalized = 'sarlat la caneda',
    department_code = '24',
    source_payload = '{"canton_code_2014":"2436","canton_name_2014":"Sarlat-la-Canéda"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2436';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Savignac-les-Églises',
    canton_name_2014_normalized = 'savignac les eglises',
    department_code = '24',
    source_payload = '{"canton_code_2014":"2437","canton_name_2014":"Savignac-les-Églises"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2437';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Villefranche-du-Périgord',
    canton_name_2014_normalized = 'villefranche du perigord',
    department_code = '24',
    source_payload = '{"canton_code_2014":"2447","canton_name_2014":"Villefranche-du-Périgord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2447';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bergerac  2e  Canton',
    canton_name_2014_normalized = 'bergerac 2e canton',
    department_code = '24',
    source_payload = '{"canton_code_2014":"2448","canton_name_2014":"Bergerac  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2448';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Périgueux-Nord-Est',
    canton_name_2014_normalized = 'perigueux nord est',
    department_code = '24',
    source_payload = '{"canton_code_2014":"2449","canton_name_2014":"Périgueux-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2449';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Périgueux-Ouest',
    canton_name_2014_normalized = 'perigueux ouest',
    department_code = '24',
    source_payload = '{"canton_code_2014":"2450","canton_name_2014":"Périgueux-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2450';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '24',
    source_payload = '{"canton_code_2014":"2496","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2496';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '24',
    source_payload = '{"canton_code_2014":"2497","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2497';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Besançon-Sud',
    canton_name_2014_normalized = 'besancon sud',
    department_code = '25',
    source_payload = '{"canton_code_2014":"2506","canton_name_2014":"Besançon-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2506';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montbéliard-Est',
    canton_name_2014_normalized = 'montbeliard est',
    department_code = '25',
    source_payload = '{"canton_code_2014":"2514","canton_name_2014":"Montbéliard-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2514';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pontarlier',
    canton_name_2014_normalized = 'pontarlier',
    department_code = '25',
    source_payload = '{"canton_code_2014":"2520","canton_name_2014":"Pontarlier"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2520';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Besançon-Est',
    canton_name_2014_normalized = 'besancon est',
    department_code = '25',
    source_payload = '{"canton_code_2014":"2528","canton_name_2014":"Besançon-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2528';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montbéliard-Ouest',
    canton_name_2014_normalized = 'montbeliard ouest',
    department_code = '25',
    source_payload = '{"canton_code_2014":"2530","canton_name_2014":"Montbéliard-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2530';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sochaux-Grand-Charmont',
    canton_name_2014_normalized = 'sochaux grand charmont',
    department_code = '25',
    source_payload = '{"canton_code_2014":"2531","canton_name_2014":"Sochaux-Grand-Charmont"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2531';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Étupes',
    canton_name_2014_normalized = 'etupes',
    department_code = '25',
    source_payload = '{"canton_code_2014":"2534","canton_name_2014":"Étupes"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2534';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '25',
    source_payload = '{"canton_code_2014":"2595","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2595';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '25',
    source_payload = '{"canton_code_2014":"2599","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2599';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bourg-de-Péage',
    canton_name_2014_normalized = 'bourg de peage',
    department_code = '26',
    source_payload = '{"canton_code_2014":"2602","canton_name_2014":"Bourg-de-Péage"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2602';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Crest-Nord',
    canton_name_2014_normalized = 'crest nord',
    department_code = '26',
    source_payload = '{"canton_code_2014":"2607","canton_name_2014":"Crest-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2607';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Crest-Sud',
    canton_name_2014_normalized = 'crest sud',
    department_code = '26',
    source_payload = '{"canton_code_2014":"2608","canton_name_2014":"Crest-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2608';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Die',
    canton_name_2014_normalized = 'die',
    department_code = '26',
    source_payload = '{"canton_code_2014":"2609","canton_name_2014":"Die"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2609';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Loriol-sur-Drôme',
    canton_name_2014_normalized = 'loriol sur drome',
    department_code = '26',
    source_payload = '{"canton_code_2014":"2613","canton_name_2014":"Loriol-sur-Drôme"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2613';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montélimar  1er Canton',
    canton_name_2014_normalized = 'montelimar 1er canton',
    department_code = '26',
    source_payload = '{"canton_code_2014":"2616","canton_name_2014":"Montélimar  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2616';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Nyons',
    canton_name_2014_normalized = 'nyons',
    department_code = '26',
    source_payload = '{"canton_code_2014":"2618","canton_name_2014":"Nyons"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2618';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Romans-sur-Isère  1er Canton',
    canton_name_2014_normalized = 'romans sur isere 1er canton',
    department_code = '26',
    source_payload = '{"canton_code_2014":"2621","canton_name_2014":"Romans-sur-Isère  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2621';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montélimar  2e  Canton',
    canton_name_2014_normalized = 'montelimar 2e canton',
    department_code = '26',
    source_payload = '{"canton_code_2014":"2633","canton_name_2014":"Montélimar  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2633';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Romans-sur-Isère  2e  Canton',
    canton_name_2014_normalized = 'romans sur isere 2e canton',
    department_code = '26',
    source_payload = '{"canton_code_2014":"2635","canton_name_2014":"Romans-sur-Isère  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2635';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '26',
    source_payload = '{"canton_code_2014":"2696","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2696';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '26',
    source_payload = '{"canton_code_2014":"2697","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2697';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '26',
    source_payload = '{"canton_code_2014":"2698","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2698';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '26',
    source_payload = '{"canton_code_2014":"2699","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2699';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bernay-Ouest',
    canton_name_2014_normalized = 'bernay ouest',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2705","canton_name_2014":"Bernay-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2705';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Écos',
    canton_name_2014_normalized = 'ecos',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2714","canton_name_2014":"Écos"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2714';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Étrépagny',
    canton_name_2014_normalized = 'etrepagny',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2715","canton_name_2014":"Étrépagny"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2715';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Évreux-Nord',
    canton_name_2014_normalized = 'evreux nord',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2716","canton_name_2014":"Évreux-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2716';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Évreux-Sud',
    canton_name_2014_normalized = 'evreux sud',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2717","canton_name_2014":"Évreux-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2717';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Louviers-Nord',
    canton_name_2014_normalized = 'louviers nord',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2721","canton_name_2014":"Louviers-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2721';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-André-de-l''Eure',
    canton_name_2014_normalized = 'saint andre de l eure',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2732","canton_name_2014":"Saint-André-de-l''Eure"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2732';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Georges-du-Vièvre',
    canton_name_2014_normalized = 'saint georges du vievre',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2733","canton_name_2014":"Saint-Georges-du-Vièvre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2733';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vernon-Nord',
    canton_name_2014_normalized = 'vernon nord',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2736","canton_name_2014":"Vernon-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2736';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Évreux-Est',
    canton_name_2014_normalized = 'evreux est',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2737","canton_name_2014":"Évreux-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2737';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Évreux-Ouest',
    canton_name_2014_normalized = 'evreux ouest',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2738","canton_name_2014":"Évreux-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2738';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Louviers-Sud',
    canton_name_2014_normalized = 'louviers sud',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2739","canton_name_2014":"Louviers-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2739';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vernon-Sud',
    canton_name_2014_normalized = 'vernon sud',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2740","canton_name_2014":"Vernon-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2740';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bernay-Est',
    canton_name_2014_normalized = 'bernay est',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2741","canton_name_2014":"Bernay-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2741';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Gaillon-Campagne',
    canton_name_2014_normalized = 'gaillon campagne',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2742","canton_name_2014":"Gaillon-Campagne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2742';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2796","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2796';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2797","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2797';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2798","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2798';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '27',
    source_payload = '{"canton_code_2014":"2799","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2799';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chartres-Nord-Est',
    canton_name_2014_normalized = 'chartres nord est',
    department_code = '28',
    source_payload = '{"canton_code_2014":"2807","canton_name_2014":"Chartres-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2807';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteaudun',
    canton_name_2014_normalized = 'chateaudun',
    department_code = '28',
    source_payload = '{"canton_code_2014":"2809","canton_name_2014":"Châteaudun"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2809';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dreux-Est',
    canton_name_2014_normalized = 'dreux est',
    department_code = '28',
    source_payload = '{"canton_code_2014":"2813","canton_name_2014":"Dreux-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2813';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Nogent-le-Rotrou',
    canton_name_2014_normalized = 'nogent le rotrou',
    department_code = '28',
    source_payload = '{"canton_code_2014":"2820","canton_name_2014":"Nogent-le-Rotrou"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2820';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chartres-Sud-Est',
    canton_name_2014_normalized = 'chartres sud est',
    department_code = '28',
    source_payload = '{"canton_code_2014":"2825","canton_name_2014":"Chartres-Sud-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2825';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chartres-Sud-Ouest',
    canton_name_2014_normalized = 'chartres sud ouest',
    department_code = '28',
    source_payload = '{"canton_code_2014":"2826","canton_name_2014":"Chartres-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2826';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dreux-Ouest',
    canton_name_2014_normalized = 'dreux ouest',
    department_code = '28',
    source_payload = '{"canton_code_2014":"2827","canton_name_2014":"Dreux-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2827';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dreux-Sud',
    canton_name_2014_normalized = 'dreux sud',
    department_code = '28',
    source_payload = '{"canton_code_2014":"2828","canton_name_2014":"Dreux-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2828';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '28',
    source_payload = '{"canton_code_2014":"2897","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2897';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '28',
    source_payload = '{"canton_code_2014":"2899","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2899';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Brest-Plouzané',
    canton_name_2014_normalized = 'brest plouzane',
    department_code = '29',
    source_payload = '{"canton_code_2014":"2903","canton_name_2014":"Brest-Plouzané"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2903';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteaulin',
    canton_name_2014_normalized = 'chateaulin',
    department_code = '29',
    source_payload = '{"canton_code_2014":"2908","canton_name_2014":"Châteaulin"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2908';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Pol-de-Léon',
    canton_name_2014_normalized = 'saint pol de leon',
    department_code = '29',
    source_payload = '{"canton_code_2014":"2938","canton_name_2014":"Saint-Pol-de-Léon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2938';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Taulé',
    canton_name_2014_normalized = 'taule',
    department_code = '29',
    source_payload = '{"canton_code_2014":"2943","canton_name_2014":"Taulé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2943';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Brest-Cavale-Blanche-Bohars-Guilers',
    canton_name_2014_normalized = 'brest cavale blanche bohars guilers',
    department_code = '29',
    source_payload = '{"canton_code_2014":"2944","canton_name_2014":"Brest-Cavale-Blanche-Bohars-Guilers"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2944';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Brest-L''Hermitage-Gouesnou',
    canton_name_2014_normalized = 'brest l hermitage gouesnou',
    department_code = '29',
    source_payload = '{"canton_code_2014":"2946","canton_name_2014":"Brest-L''Hermitage-Gouesnou"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2946';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Quimper  2e  Canton',
    canton_name_2014_normalized = 'quimper 2e canton',
    department_code = '29',
    source_payload = '{"canton_code_2014":"2948","canton_name_2014":"Quimper  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2948';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Quimper  3e  Canton',
    canton_name_2014_normalized = 'quimper 3e canton',
    department_code = '29',
    source_payload = '{"canton_code_2014":"2952","canton_name_2014":"Quimper  3e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2952';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '29',
    source_payload = '{"canton_code_2014":"2998","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2998';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '29',
    source_payload = '{"canton_code_2014":"2999","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2999';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Alès-Nord-Est',
    canton_name_2014_normalized = 'ales nord est',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3002","canton_name_2014":"Alès-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3002';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Alès-Ouest',
    canton_name_2014_normalized = 'ales ouest',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3003","canton_name_2014":"Alès-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3003';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bagnols-sur-Cèze',
    canton_name_2014_normalized = 'bagnols sur ceze',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3007","canton_name_2014":"Bagnols-sur-Cèze"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3007';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bessèges',
    canton_name_2014_normalized = 'besseges',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3010","canton_name_2014":"Bessèges"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3010';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Génolhac',
    canton_name_2014_normalized = 'genolhac',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3011","canton_name_2014":"Génolhac"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3011';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lédignan',
    canton_name_2014_normalized = 'ledignan',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3014","canton_name_2014":"Lédignan"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3014';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-André-de-Valborgne',
    canton_name_2014_normalized = 'saint andre de valborgne',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3025","canton_name_2014":"Saint-André-de-Valborgne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3025';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sommières',
    canton_name_2014_normalized = 'sommieres',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3032","canton_name_2014":"Sommières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3032';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sumène',
    canton_name_2014_normalized = 'sumene',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3033","canton_name_2014":"Sumène"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3033';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Trèves',
    canton_name_2014_normalized = 'treves',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3034","canton_name_2014":"Trèves"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3034';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Uzès',
    canton_name_2014_normalized = 'uzes',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3035","canton_name_2014":"Uzès"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3035';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vézénobres',
    canton_name_2014_normalized = 'vezenobres',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3038","canton_name_2014":"Vézénobres"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3038';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vigan',
    canton_name_2014_normalized = 'vigan',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3039","canton_name_2014":"Vigan"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3039';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Villeneuve-lès-Avignon',
    canton_name_2014_normalized = 'villeneuve les avignon',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3040","canton_name_2014":"Villeneuve-lès-Avignon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3040';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Alès-Sud-Est',
    canton_name_2014_normalized = 'ales sud est',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3041","canton_name_2014":"Alès-Sud-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3041';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vistrenque',
    canton_name_2014_normalized = 'vistrenque',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3045","canton_name_2014":"Vistrenque"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3045';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rhôny-Vidourle',
    canton_name_2014_normalized = 'rhony vidourle',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3046","canton_name_2014":"Rhôny-Vidourle"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3046';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3098","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3098';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '30',
    source_payload = '{"canton_code_2014":"3099","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3099';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bagnères-de-Luchon',
    canton_name_2014_normalized = 'bagneres de luchon',
    department_code = '31',
    source_payload = '{"canton_code_2014":"3104","canton_name_2014":"Bagnères-de-Luchon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3104';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cazères',
    canton_name_2014_normalized = 'cazeres',
    department_code = '31',
    source_payload = '{"canton_code_2014":"3111","canton_name_2014":"Cazères"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3111';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Léguevin',
    canton_name_2014_normalized = 'leguevin',
    department_code = '31',
    source_payload = '{"canton_code_2014":"3118","canton_name_2014":"Léguevin"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3118';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montastruc-la-Conseillère',
    canton_name_2014_normalized = 'montastruc la conseillere',
    department_code = '31',
    source_payload = '{"canton_code_2014":"3119","canton_name_2014":"Montastruc-la-Conseillère"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3119';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montréjeau',
    canton_name_2014_normalized = 'montrejeau',
    department_code = '31',
    source_payload = '{"canton_code_2014":"3122","canton_name_2014":"Montréjeau"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3122';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Muret',
    canton_name_2014_normalized = 'muret',
    department_code = '31',
    source_payload = '{"canton_code_2014":"3123","canton_name_2014":"Muret"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3123';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Béat',
    canton_name_2014_normalized = 'saint beat',
    department_code = '31',
    source_payload = '{"canton_code_2014":"3128","canton_name_2014":"Saint-Béat"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3128';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Gaudens',
    canton_name_2014_normalized = 'saint gaudens',
    department_code = '31',
    source_payload = '{"canton_code_2014":"3129","canton_name_2014":"Saint-Gaudens"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3129';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Toulouse  8e  Canton',
    canton_name_2014_normalized = 'toulouse 8e canton',
    department_code = '31',
    source_payload = '{"canton_code_2014":"3143","canton_name_2014":"Toulouse  8e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3143';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Toulouse  9e  Canton',
    canton_name_2014_normalized = 'toulouse 9e canton',
    department_code = '31',
    source_payload = '{"canton_code_2014":"3144","canton_name_2014":"Toulouse  9e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3144';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Toulouse 13e  Canton',
    canton_name_2014_normalized = 'toulouse 13e canton',
    department_code = '31',
    source_payload = '{"canton_code_2014":"3148","canton_name_2014":"Toulouse 13e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3148';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Toulouse 14e  Canton',
    canton_name_2014_normalized = 'toulouse 14e canton',
    department_code = '31',
    source_payload = '{"canton_code_2014":"3149","canton_name_2014":"Toulouse 14e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3149';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Toulouse 15e  Canton',
    canton_name_2014_normalized = 'toulouse 15e canton',
    department_code = '31',
    source_payload = '{"canton_code_2014":"3150","canton_name_2014":"Toulouse 15e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3150';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '31',
    source_payload = '{"canton_code_2014":"3199","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3199';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Auch-Nord-Est',
    canton_name_2014_normalized = 'auch nord est',
    department_code = '32',
    source_payload = '{"canton_code_2014":"3202","canton_name_2014":"Auch-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3202';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Auch-Sud-Est-Seissan',
    canton_name_2014_normalized = 'auch sud est seissan',
    department_code = '32',
    source_payload = '{"canton_code_2014":"3203","canton_name_2014":"Auch-Sud-Est-Seissan"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3203';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Condom',
    canton_name_2014_normalized = 'condom',
    department_code = '32',
    source_payload = '{"canton_code_2014":"3206","canton_name_2014":"Condom"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3206';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Miélan',
    canton_name_2014_normalized = 'mielan',
    department_code = '32',
    source_payload = '{"canton_code_2014":"3217","canton_name_2014":"Miélan"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3217';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mirande',
    canton_name_2014_normalized = 'mirande',
    department_code = '32',
    source_payload = '{"canton_code_2014":"3219","canton_name_2014":"Mirande"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3219';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montréal',
    canton_name_2014_normalized = 'montreal',
    department_code = '32',
    source_payload = '{"canton_code_2014":"3221","canton_name_2014":"Montréal"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3221';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Valence-sur-Baïse',
    canton_name_2014_normalized = 'valence sur baise',
    department_code = '32',
    source_payload = '{"canton_code_2014":"3228","canton_name_2014":"Valence-sur-Baïse"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3228';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Auch-Nord-Ouest',
    canton_name_2014_normalized = 'auch nord ouest',
    department_code = '32',
    source_payload = '{"canton_code_2014":"3230","canton_name_2014":"Auch-Nord-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3230';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Auch-Sud-Ouest',
    canton_name_2014_normalized = 'auch sud ouest',
    department_code = '32',
    source_payload = '{"canton_code_2014":"3231","canton_name_2014":"Auch-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3231';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '32',
    source_payload = '{"canton_code_2014":"3299","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3299';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Belin-Béliet',
    canton_name_2014_normalized = 'belin beliet',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3305","canton_name_2014":"Belin-Béliet"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3305';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Blaye',
    canton_name_2014_normalized = 'blaye',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3307","canton_name_2014":"Blaye"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3307';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Castelnau-de-Médoc',
    canton_name_2014_normalized = 'castelnau de medoc',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3320","canton_name_2014":"Castelnau-de-Médoc"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3320';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Créon',
    canton_name_2014_normalized = 'creon',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3323","canton_name_2014":"Créon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3323';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Guîtres',
    canton_name_2014_normalized = 'guitres',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3326","canton_name_2014":"Guîtres"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3326';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Brède',
    canton_name_2014_normalized = 'brede',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3327","canton_name_2014":"Brède"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3327';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Langon',
    canton_name_2014_normalized = 'langon',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3328","canton_name_2014":"Langon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3328';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lesparre-Médoc',
    canton_name_2014_normalized = 'lesparre medoc',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3329","canton_name_2014":"Lesparre-Médoc"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3329';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Libourne',
    canton_name_2014_normalized = 'libourne',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3330","canton_name_2014":"Libourne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3330';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Monségur',
    canton_name_2014_normalized = 'monsegur',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3332","canton_name_2014":"Monségur"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3332';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Réole',
    canton_name_2014_normalized = 'reole',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3338","canton_name_2014":"Réole"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3338';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-André-de-Cubzac',
    canton_name_2014_normalized = 'saint andre de cubzac',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3339","canton_name_2014":"Saint-André-de-Cubzac"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3339';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Laurent-Médoc',
    canton_name_2014_normalized = 'saint laurent medoc',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3342","canton_name_2014":"Saint-Laurent-Médoc"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3342';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Vivien-de-Médoc',
    canton_name_2014_normalized = 'saint vivien de medoc',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3346","canton_name_2014":"Saint-Vivien-de-Médoc"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3346';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bègles',
    canton_name_2014_normalized = 'begles',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3352","canton_name_2014":"Bègles"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3352';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mérignac  2e  Canton',
    canton_name_2014_normalized = 'merignac 2e canton',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3361","canton_name_2014":"Mérignac  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3361';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Médard-en-Jalles',
    canton_name_2014_normalized = 'saint medard en jalles',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3363","canton_name_2014":"Saint-Médard-en-Jalles"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3363';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3397","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3397';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3398","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3398';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '33',
    source_payload = '{"canton_code_2014":"3399","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3399';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bédarieux',
    canton_name_2014_normalized = 'bedarieux',
    department_code = '34',
    source_payload = '{"canton_code_2014":"3403","canton_name_2014":"Bédarieux"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3403';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Béziers  2e  Canton',
    canton_name_2014_normalized = 'beziers 2e canton',
    department_code = '34',
    source_payload = '{"canton_code_2014":"3405","canton_name_2014":"Béziers  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3405';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Clermont-l''Hérault',
    canton_name_2014_normalized = 'clermont l herault',
    department_code = '34',
    source_payload = '{"canton_code_2014":"3410","canton_name_2014":"Clermont-l''Hérault"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3410';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lodève',
    canton_name_2014_normalized = 'lodeve',
    department_code = '34',
    source_payload = '{"canton_code_2014":"3415","canton_name_2014":"Lodève"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3415';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mèze',
    canton_name_2014_normalized = 'meze',
    department_code = '34',
    source_payload = '{"canton_code_2014":"3420","canton_name_2014":"Mèze"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3420';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montpellier  2e  Canton',
    canton_name_2014_normalized = 'montpellier 2e canton',
    department_code = '34',
    source_payload = '{"canton_code_2014":"3423","canton_name_2014":"Montpellier  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3423';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Murviel-lès-Béziers',
    canton_name_2014_normalized = 'murviel les beziers',
    department_code = '34',
    source_payload = '{"canton_code_2014":"3425","canton_name_2014":"Murviel-lès-Béziers"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3425';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pézenas',
    canton_name_2014_normalized = 'pezenas',
    department_code = '34',
    source_payload = '{"canton_code_2014":"3428","canton_name_2014":"Pézenas"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3428';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Pons-de-Thomières',
    canton_name_2014_normalized = 'saint pons de thomieres',
    department_code = '34',
    source_payload = '{"canton_code_2014":"3433","canton_name_2014":"Saint-Pons-de-Thomières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3433';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Béziers  3e  Canton',
    canton_name_2014_normalized = 'beziers 3e canton',
    department_code = '34',
    source_payload = '{"canton_code_2014":"3438","canton_name_2014":"Béziers  3e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3438';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Béziers  4e  Canton',
    canton_name_2014_normalized = 'beziers 4e canton',
    department_code = '34',
    source_payload = '{"canton_code_2014":"3439","canton_name_2014":"Béziers  4e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3439';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montpellier  8e  Canton',
    canton_name_2014_normalized = 'montpellier 8e canton',
    department_code = '34',
    source_payload = '{"canton_code_2014":"3444","canton_name_2014":"Montpellier  8e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3444';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montpellier 10e  Canton',
    canton_name_2014_normalized = 'montpellier 10e canton',
    department_code = '34',
    source_payload = '{"canton_code_2014":"3446","canton_name_2014":"Montpellier 10e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3446';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '34',
    source_payload = '{"canton_code_2014":"3497","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3497';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '34',
    source_payload = '{"canton_code_2014":"3498","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3498';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '34',
    source_payload = '{"canton_code_2014":"3499","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3499';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Argentré-du-Plessis',
    canton_name_2014_normalized = 'argentre du plessis',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3502","canton_name_2014":"Argentré-du-Plessis"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3502';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bécherel',
    canton_name_2014_normalized = 'becherel',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3504","canton_name_2014":"Bécherel"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3504';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteaubourg',
    canton_name_2014_normalized = 'chateaubourg',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3506","canton_name_2014":"Châteaubourg"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3506';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteaugiron',
    canton_name_2014_normalized = 'chateaugiron',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3507","canton_name_2014":"Châteaugiron"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3507';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteauneuf-d''Ille-et-Vilaine',
    canton_name_2014_normalized = 'chateauneuf d ille et vilaine',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3508","canton_name_2014":"Châteauneuf-d''Ille-et-Vilaine"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3508';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fougères-Nord',
    canton_name_2014_normalized = 'fougeres nord',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3512","canton_name_2014":"Fougères-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3512';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fougères-Sud',
    canton_name_2014_normalized = 'fougeres sud',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3513","canton_name_2014":"Fougères-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3513';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Hédé-Bazouges',
    canton_name_2014_normalized = 'hede bazouges',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3517","canton_name_2014":"Hédé-Bazouges"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3517';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Janzé',
    canton_name_2014_normalized = 'janze',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3518","canton_name_2014":"Janzé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3518';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Liffré',
    canton_name_2014_normalized = 'liffre',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3519","canton_name_2014":"Liffré"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3519';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Louvigné-du-Désert',
    canton_name_2014_normalized = 'louvigne du desert',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3520","canton_name_2014":"Louvigné-du-Désert"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3520';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pleine-Fougères',
    canton_name_2014_normalized = 'pleine fougeres',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3526","canton_name_2014":"Pleine-Fougères"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3526';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Plélan-le-Grand',
    canton_name_2014_normalized = 'plelan le grand',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3527","canton_name_2014":"Plélan-le-Grand"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3527';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Redon',
    canton_name_2014_normalized = 'redon',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3528","canton_name_2014":"Redon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3528';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rennes-Nord-Ouest',
    canton_name_2014_normalized = 'rennes nord ouest',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3531","canton_name_2014":"Rennes-Nord-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3531';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Aubin-d''Aubigné',
    canton_name_2014_normalized = 'saint aubin d aubigne',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3534","canton_name_2014":"Saint-Aubin-d''Aubigné"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3534';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Brice-en-Coglès',
    canton_name_2014_normalized = 'saint brice en cogles',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3536","canton_name_2014":"Saint-Brice-en-Coglès"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3536';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Méen-le-Grand',
    canton_name_2014_normalized = 'saint meen le grand',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3538","canton_name_2014":"Saint-Méen-le-Grand"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3538';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Malo-Sud',
    canton_name_2014_normalized = 'saint malo sud',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3539","canton_name_2014":"Saint-Malo-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3539';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Tinténiac',
    canton_name_2014_normalized = 'tinteniac',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3541","canton_name_2014":"Tinténiac"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3541';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vitré-Est',
    canton_name_2014_normalized = 'vitre est',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3542","canton_name_2014":"Vitré-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3542';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vitré-Ouest',
    canton_name_2014_normalized = 'vitre ouest',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3543","canton_name_2014":"Vitré-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3543';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rennes-Sud-Est',
    canton_name_2014_normalized = 'rennes sud est',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3546","canton_name_2014":"Rennes-Sud-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3546';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rennes-Sud-Ouest',
    canton_name_2014_normalized = 'rennes sud ouest',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3549","canton_name_2014":"Rennes-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3549';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cesson-Sévigné',
    canton_name_2014_normalized = 'cesson sevigne',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3553","canton_name_2014":"Cesson-Sévigné"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3553';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3596","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3596';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3597","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3597';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3598","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3598';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '35',
    source_payload = '{"canton_code_2014":"3599","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3599';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bélâbre',
    canton_name_2014_normalized = 'belabre',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3604","canton_name_2014":"Bélâbre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3604';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Buzançais',
    canton_name_2014_normalized = 'buzancais',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3606","canton_name_2014":"Buzançais"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3606';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtillon-sur-Indre',
    canton_name_2014_normalized = 'chatillon sur indre',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3608","canton_name_2014":"Châtillon-sur-Indre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3608';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtre',
    canton_name_2014_normalized = 'chatre',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3609","canton_name_2014":"Châtre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3609';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Écueillé',
    canton_name_2014_normalized = 'ecueille',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3610","canton_name_2014":"Écueillé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3610';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Éguzon-Chantôme',
    canton_name_2014_normalized = 'eguzon chantome',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3611","canton_name_2014":"Éguzon-Chantôme"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3611';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Issoudun-Nord',
    canton_name_2014_normalized = 'issoudun nord',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3612","canton_name_2014":"Issoudun-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3612';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Issoudun-Sud',
    canton_name_2014_normalized = 'issoudun sud',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3613","canton_name_2014":"Issoudun-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3613';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mézières-en-Brenne',
    canton_name_2014_normalized = 'mezieres en brenne',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3615","canton_name_2014":"Mézières-en-Brenne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3615';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Neuvy-Saint-Sépulchre',
    canton_name_2014_normalized = 'neuvy saint sepulchre',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3616","canton_name_2014":"Neuvy-Saint-Sépulchre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3616';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Benoît-du-Sault',
    canton_name_2014_normalized = 'saint benoit du sault',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3617","canton_name_2014":"Saint-Benoît-du-Sault"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3617';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sainte-Sévère-sur-Indre',
    canton_name_2014_normalized = 'sainte severe sur indre',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3620","canton_name_2014":"Sainte-Sévère-sur-Indre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3620';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Valençay',
    canton_name_2014_normalized = 'valencay',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3622","canton_name_2014":"Valençay"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3622';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteauroux-Est',
    canton_name_2014_normalized = 'chateauroux est',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3624","canton_name_2014":"Châteauroux-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3624';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteauroux-Ouest',
    canton_name_2014_normalized = 'chateauroux ouest',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3625","canton_name_2014":"Châteauroux-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3625';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3698","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3698';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '36',
    source_payload = '{"canton_code_2014":"3699","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3699';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bléré',
    canton_name_2014_normalized = 'blere',
    department_code = '37',
    source_payload = '{"canton_code_2014":"3703","canton_name_2014":"Bléré"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3703';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Château-la-Vallière',
    canton_name_2014_normalized = 'chateau la valliere',
    department_code = '37',
    source_payload = '{"canton_code_2014":"3705","canton_name_2014":"Château-la-Vallière"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3705';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Château-Renault',
    canton_name_2014_normalized = 'chateau renault',
    department_code = '37',
    source_payload = '{"canton_code_2014":"3706","canton_name_2014":"Château-Renault"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3706';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chinon',
    canton_name_2014_normalized = 'chinon',
    department_code = '37',
    source_payload = '{"canton_code_2014":"3707","canton_name_2014":"Chinon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3707';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Île-Bouchard',
    canton_name_2014_normalized = 'ile bouchard',
    department_code = '37',
    source_payload = '{"canton_code_2014":"3710","canton_name_2014":"Île-Bouchard"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3710';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Loches',
    canton_name_2014_normalized = 'loches',
    department_code = '37',
    source_payload = '{"canton_code_2014":"3713","canton_name_2014":"Loches"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3713';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montrésor',
    canton_name_2014_normalized = 'montresor',
    department_code = '37',
    source_payload = '{"canton_code_2014":"3715","canton_name_2014":"Montrésor"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3715';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Neuillé-Pont-Pierre',
    canton_name_2014_normalized = 'neuille pont pierre',
    department_code = '37',
    source_payload = '{"canton_code_2014":"3716","canton_name_2014":"Neuillé-Pont-Pierre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3716';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ballan-Miré',
    canton_name_2014_normalized = 'ballan mire',
    department_code = '37',
    source_payload = '{"canton_code_2014":"3731","canton_name_2014":"Ballan-Miré"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3731';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chambray-lès-Tours',
    canton_name_2014_normalized = 'chambray les tours',
    department_code = '37',
    source_payload = '{"canton_code_2014":"3734","canton_name_2014":"Chambray-lès-Tours"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3734';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '37',
    source_payload = '{"canton_code_2014":"3798","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3798';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '37',
    source_payload = '{"canton_code_2014":"3799","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3799';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bourgoin-Jallieu-Sud',
    canton_name_2014_normalized = 'bourgoin jallieu sud',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3804","canton_name_2014":"Bourgoin-Jallieu-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3804';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Côte-Saint-André',
    canton_name_2014_normalized = 'cote saint andre',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3807","canton_name_2014":"Côte-Saint-André"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3807';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Crémieu',
    canton_name_2014_normalized = 'cremieu',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3808","canton_name_2014":"Crémieu"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3808';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Domène',
    canton_name_2014_normalized = 'domene',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3809","canton_name_2014":"Domène"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3809';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Étienne-de-Saint-Geoirs',
    canton_name_2014_normalized = 'saint etienne de saint geoirs',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3826","canton_name_2014":"Saint-Étienne-de-Saint-Geoirs"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3826';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fontaine-Sassenage',
    canton_name_2014_normalized = 'fontaine sassenage',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3832","canton_name_2014":"Fontaine-Sassenage"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3832';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Tour-du-Pin',
    canton_name_2014_normalized = 'tour du pin',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3833","canton_name_2014":"Tour-du-Pin"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3833';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Verpillière',
    canton_name_2014_normalized = 'verpilliere',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3837","canton_name_2014":"Verpillière"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3837';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vienne-Nord',
    canton_name_2014_normalized = 'vienne nord',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3838","canton_name_2014":"Vienne-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3838';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vienne-Sud',
    canton_name_2014_normalized = 'vienne sud',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3839","canton_name_2014":"Vienne-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3839';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pont-de-Chéruy',
    canton_name_2014_normalized = 'pont de cheruy',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3846","canton_name_2014":"Pont-de-Chéruy"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3846';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Échirolles-Est',
    canton_name_2014_normalized = 'echirolles est',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3847","canton_name_2014":"Échirolles-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3847';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Égrève',
    canton_name_2014_normalized = 'saint egreve',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3851","canton_name_2014":"Saint-Égrève"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3851';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bourgoin-Jallieu-Nord',
    canton_name_2014_normalized = 'bourgoin jallieu nord',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3853","canton_name_2014":"Bourgoin-Jallieu-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3853';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fontaine-Seyssinet',
    canton_name_2014_normalized = 'fontaine seyssinet',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3856","canton_name_2014":"Fontaine-Seyssinet"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3856';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Isle-d''Abeau',
    canton_name_2014_normalized = 'isle d abeau',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3858","canton_name_2014":"Isle-d''Abeau"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3858';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3893","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3893';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3894","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3894';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3895","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3895';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3896","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3896';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3897","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3897';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3898","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3898';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '38',
    source_payload = '{"canton_code_2014":"3899","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3899';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Conliège',
    canton_name_2014_normalized = 'conliege',
    department_code = '39',
    source_payload = '{"canton_code_2014":"3911","canton_name_2014":"Conliège"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3911';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dole-Nord-Est',
    canton_name_2014_normalized = 'dole nord est',
    department_code = '39',
    source_payload = '{"canton_code_2014":"3913","canton_name_2014":"Dole-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3913';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lons-le-Saunier-Nord',
    canton_name_2014_normalized = 'lons le saunier nord',
    department_code = '39',
    source_payload = '{"canton_code_2014":"3915","canton_name_2014":"Lons-le-Saunier-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3915';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montmirey-le-Château',
    canton_name_2014_normalized = 'montmirey le chateau',
    department_code = '39',
    source_payload = '{"canton_code_2014":"3918","canton_name_2014":"Montmirey-le-Château"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3918';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Claude',
    canton_name_2014_normalized = 'saint claude',
    department_code = '39',
    source_payload = '{"canton_code_2014":"3926","canton_name_2014":"Saint-Claude"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3926';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sellières',
    canton_name_2014_normalized = 'sellieres',
    department_code = '39',
    source_payload = '{"canton_code_2014":"3930","canton_name_2014":"Sellières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3930';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dole-Sud-Ouest',
    canton_name_2014_normalized = 'dole sud ouest',
    department_code = '39',
    source_payload = '{"canton_code_2014":"3933","canton_name_2014":"Dole-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3933';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lons-le-Saunier-Sud',
    canton_name_2014_normalized = 'lons le saunier sud',
    department_code = '39',
    source_payload = '{"canton_code_2014":"3934","canton_name_2014":"Lons-le-Saunier-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3934';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '39',
    source_payload = '{"canton_code_2014":"3996","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3996';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '39',
    source_payload = '{"canton_code_2014":"3997","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '3997';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dax-Nord',
    canton_name_2014_normalized = 'dax nord',
    department_code = '40',
    source_payload = '{"canton_code_2014":"4004","canton_name_2014":"Dax-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4004';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mont-de-Marsan-Nord',
    canton_name_2014_normalized = 'mont de marsan nord',
    department_code = '40',
    source_payload = '{"canton_code_2014":"4011","canton_name_2014":"Mont-de-Marsan-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4011';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Tartas-Est',
    canton_name_2014_normalized = 'tartas est',
    department_code = '40',
    source_payload = '{"canton_code_2014":"4026","canton_name_2014":"Tartas-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4026';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Tartas-Ouest',
    canton_name_2014_normalized = 'tartas ouest',
    department_code = '40',
    source_payload = '{"canton_code_2014":"4027","canton_name_2014":"Tartas-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4027';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dax-Sud',
    canton_name_2014_normalized = 'dax sud',
    department_code = '40',
    source_payload = '{"canton_code_2014":"4029","canton_name_2014":"Dax-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4029';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mont-de-Marsan-Sud',
    canton_name_2014_normalized = 'mont de marsan sud',
    department_code = '40',
    source_payload = '{"canton_code_2014":"4030","canton_name_2014":"Mont-de-Marsan-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4030';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '40',
    source_payload = '{"canton_code_2014":"4097","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4097';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '40',
    source_payload = '{"canton_code_2014":"4098","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4098';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '40',
    source_payload = '{"canton_code_2014":"4099","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4099';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Blois  1er Canton',
    canton_name_2014_normalized = 'blois 1er canton',
    department_code = '41',
    source_payload = '{"canton_code_2014":"4101","canton_name_2014":"Blois  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4101';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Blois  2e  Canton',
    canton_name_2014_normalized = 'blois 2e canton',
    department_code = '41',
    source_payload = '{"canton_code_2014":"4102","canton_name_2014":"Blois  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4102';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Droué',
    canton_name_2014_normalized = 'droue',
    department_code = '41',
    source_payload = '{"canton_code_2014":"4105","canton_name_2014":"Droué"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4105';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Morée',
    canton_name_2014_normalized = 'moree',
    department_code = '41',
    source_payload = '{"canton_code_2014":"4114","canton_name_2014":"Morée"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4114';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ouzouer-le-Marché',
    canton_name_2014_normalized = 'ouzouer le marche',
    department_code = '41',
    source_payload = '{"canton_code_2014":"4116","canton_name_2014":"Ouzouer-le-Marché"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4116';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Romorantin-Lanthenay-Nord',
    canton_name_2014_normalized = 'romorantin lanthenay nord',
    department_code = '41',
    source_payload = '{"canton_code_2014":"4117","canton_name_2014":"Romorantin-Lanthenay-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4117';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Amand-Longpré',
    canton_name_2014_normalized = 'saint amand longpre',
    department_code = '41',
    source_payload = '{"canton_code_2014":"4119","canton_name_2014":"Saint-Amand-Longpré"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4119';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vendôme  1er Canton',
    canton_name_2014_normalized = 'vendome 1er canton',
    department_code = '41',
    source_payload = '{"canton_code_2014":"4124","canton_name_2014":"Vendôme  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4124';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Blois  5e  Canton',
    canton_name_2014_normalized = 'blois 5e canton',
    department_code = '41',
    source_payload = '{"canton_code_2014":"4127","canton_name_2014":"Blois  5e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4127';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vendôme  2e  Canton',
    canton_name_2014_normalized = 'vendome 2e canton',
    department_code = '41',
    source_payload = '{"canton_code_2014":"4128","canton_name_2014":"Vendôme  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4128';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Romorantin-Lanthenay-Sud',
    canton_name_2014_normalized = 'romorantin lanthenay sud',
    department_code = '41',
    source_payload = '{"canton_code_2014":"4129","canton_name_2014":"Romorantin-Lanthenay-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4129';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '41',
    source_payload = '{"canton_code_2014":"4197","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4197';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '41',
    source_payload = '{"canton_code_2014":"4198","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4198';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '41',
    source_payload = '{"canton_code_2014":"4199","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4199';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Boën-sur-Lignon',
    canton_name_2014_normalized = 'boen sur lignon',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4202","canton_name_2014":"Boën-sur-Lignon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4202';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montbrison',
    canton_name_2014_normalized = 'montbrison',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4209","canton_name_2014":"Montbrison"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4209';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Néronde',
    canton_name_2014_normalized = 'neronde',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4210","canton_name_2014":"Néronde"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4210';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Noirétable',
    canton_name_2014_normalized = 'noiretable',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4211","canton_name_2014":"Noirétable"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4211';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pacaudière',
    canton_name_2014_normalized = 'pacaudiere',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4212","canton_name_2014":"Pacaudière"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4212';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pélussin',
    canton_name_2014_normalized = 'pelussin',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4213","canton_name_2014":"Pélussin"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4213';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Roanne-Nord',
    canton_name_2014_normalized = 'roanne nord',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4216","canton_name_2014":"Roanne-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4216';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Bonnet-le-Château',
    canton_name_2014_normalized = 'saint bonnet le chateau',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4217","canton_name_2014":"Saint-Bonnet-le-Château"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4217';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Chamond-Sud',
    canton_name_2014_normalized = 'saint chamond sud',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4218","canton_name_2014":"Saint-Chamond-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4218';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Étienne-Nord-Est-2',
    canton_name_2014_normalized = 'saint etienne nord est 2',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4220","canton_name_2014":"Saint-Étienne-Nord-Est-2"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4220';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Étienne-Nord-Ouest-1',
    canton_name_2014_normalized = 'saint etienne nord ouest 1',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4221","canton_name_2014":"Saint-Étienne-Nord-Ouest-1"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4221';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Étienne-Nord-Ouest-2',
    canton_name_2014_normalized = 'saint etienne nord ouest 2',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4222","canton_name_2014":"Saint-Étienne-Nord-Ouest-2"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4222';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Haon-le-Châtel',
    canton_name_2014_normalized = 'saint haon le chatel',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4227","canton_name_2014":"Saint-Haon-le-Châtel"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4227';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Héand',
    canton_name_2014_normalized = 'saint heand',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4228","canton_name_2014":"Saint-Héand"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4228';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Roanne-Sud',
    canton_name_2014_normalized = 'roanne sud',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4234","canton_name_2014":"Roanne-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4234';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4297","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4297';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4298","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4298';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '42',
    source_payload = '{"canton_code_2014":"4299","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4299';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Allègre',
    canton_name_2014_normalized = 'allegre',
    department_code = '43',
    source_payload = '{"canton_code_2014":"4301","canton_name_2014":"Allègre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4301';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Brioude-Nord',
    canton_name_2014_normalized = 'brioude nord',
    department_code = '43',
    source_payload = '{"canton_code_2014":"4305","canton_name_2014":"Brioude-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4305';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lavoûte-Chilhac',
    canton_name_2014_normalized = 'lavoute chilhac',
    department_code = '43',
    source_payload = '{"canton_code_2014":"4311","canton_name_2014":"Lavoûte-Chilhac"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4311';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Puy-en-Velay-Nord',
    canton_name_2014_normalized = 'puy en velay nord',
    department_code = '43',
    source_payload = '{"canton_code_2014":"4319","canton_name_2014":"Puy-en-Velay-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4319';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Puy-en-Velay-Sud-Est',
    canton_name_2014_normalized = 'puy en velay sud est',
    department_code = '43',
    source_payload = '{"canton_code_2014":"4320","canton_name_2014":"Puy-en-Velay-Sud-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4320';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Yssingeaux',
    canton_name_2014_normalized = 'yssingeaux',
    department_code = '43',
    source_payload = '{"canton_code_2014":"4329","canton_name_2014":"Yssingeaux"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4329';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Puy-en-Velay-Est',
    canton_name_2014_normalized = 'puy en velay est',
    department_code = '43',
    source_payload = '{"canton_code_2014":"4331","canton_name_2014":"Puy-en-Velay-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4331';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Puy-en-Velay-Ouest',
    canton_name_2014_normalized = 'puy en velay ouest',
    department_code = '43',
    source_payload = '{"canton_code_2014":"4332","canton_name_2014":"Puy-en-Velay-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4332';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Puy-en-Velay-Sud-Ouest',
    canton_name_2014_normalized = 'puy en velay sud ouest',
    department_code = '43',
    source_payload = '{"canton_code_2014":"4333","canton_name_2014":"Puy-en-Velay-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4333';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Brioude-Sud',
    canton_name_2014_normalized = 'brioude sud',
    department_code = '43',
    source_payload = '{"canton_code_2014":"4334","canton_name_2014":"Brioude-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4334';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sainte-Sigolène',
    canton_name_2014_normalized = 'sainte sigolene',
    department_code = '43',
    source_payload = '{"canton_code_2014":"4335","canton_name_2014":"Sainte-Sigolène"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4335';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '43',
    source_payload = '{"canton_code_2014":"4397","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4397';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '43',
    source_payload = '{"canton_code_2014":"4398","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4398';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '43',
    source_payload = '{"canton_code_2014":"4399","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4399';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteaubriant',
    canton_name_2014_normalized = 'chateaubriant',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4408","canton_name_2014":"Châteaubriant"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4408';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Guémené-Penfao',
    canton_name_2014_normalized = 'guemene penfao',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4412","canton_name_2014":"Guémené-Penfao"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4412';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Guérande',
    canton_name_2014_normalized = 'guerande',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4413","canton_name_2014":"Guérande"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4413';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Legé',
    canton_name_2014_normalized = 'lege',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4415","canton_name_2014":"Legé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4415';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ligné',
    canton_name_2014_normalized = 'ligne',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4416","canton_name_2014":"Ligné"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4416';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Moisdon-la-Rivière',
    canton_name_2014_normalized = 'moisdon la riviere',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4419","canton_name_2014":"Moisdon-la-Rivière"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4419';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pontchâteau',
    canton_name_2014_normalized = 'pontchateau',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4431","canton_name_2014":"Pontchâteau"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4431';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Riaillé',
    canton_name_2014_normalized = 'riaille',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4433","canton_name_2014":"Riaillé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4433';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rougé',
    canton_name_2014_normalized = 'rouge',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4434","canton_name_2014":"Rougé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4434';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Étienne-de-Montluc',
    canton_name_2014_normalized = 'saint etienne de montluc',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4435","canton_name_2014":"Saint-Étienne-de-Montluc"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4435';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Père-en-Retz',
    canton_name_2014_normalized = 'saint pere en retz',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4441","canton_name_2014":"Saint-Père-en-Retz"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4441';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Nantes 10e  Canton',
    canton_name_2014_normalized = 'nantes 10e canton',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4450","canton_name_2014":"Nantes 10e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4450';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rezé',
    canton_name_2014_normalized = 'reze',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4451","canton_name_2014":"Rezé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4451';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Herblain-Ouest-Indre',
    canton_name_2014_normalized = 'saint herblain ouest indre',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4455","canton_name_2014":"Saint-Herblain-Ouest-Indre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4455';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vertou-Vignoble',
    canton_name_2014_normalized = 'vertou vignoble',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4459","canton_name_2014":"Vertou-Vignoble"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4459';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4496","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4496';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4497","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4497';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4498","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4498';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '44',
    source_payload = '{"canton_code_2014":"4499","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4499';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteauneuf-sur-Loire',
    canton_name_2014_normalized = 'chateauneuf sur loire',
    department_code = '45',
    source_payload = '{"canton_code_2014":"4506","canton_name_2014":"Châteauneuf-sur-Loire"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4506';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Château-Renard',
    canton_name_2014_normalized = 'chateau renard',
    department_code = '45',
    source_payload = '{"canton_code_2014":"4507","canton_name_2014":"Château-Renard"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4507';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtillon-Coligny',
    canton_name_2014_normalized = 'chatillon coligny',
    department_code = '45',
    source_payload = '{"canton_code_2014":"4508","canton_name_2014":"Châtillon-Coligny"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4508';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtillon-sur-Loire',
    canton_name_2014_normalized = 'chatillon sur loire',
    department_code = '45',
    source_payload = '{"canton_code_2014":"4509","canton_name_2014":"Châtillon-sur-Loire"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4509';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cléry-Saint-André',
    canton_name_2014_normalized = 'clery saint andre',
    department_code = '45',
    source_payload = '{"canton_code_2014":"4510","canton_name_2014":"Cléry-Saint-André"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4510';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ferrières-en-Gâtinais',
    canton_name_2014_normalized = 'ferrieres en gatinais',
    department_code = '45',
    source_payload = '{"canton_code_2014":"4512","canton_name_2014":"Ferrières-en-Gâtinais"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4512';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ferté-Saint-Aubin',
    canton_name_2014_normalized = 'ferte saint aubin',
    department_code = '45',
    source_payload = '{"canton_code_2014":"4513","canton_name_2014":"Ferté-Saint-Aubin"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4513';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pithiviers',
    canton_name_2014_normalized = 'pithiviers',
    department_code = '45',
    source_payload = '{"canton_code_2014":"4529","canton_name_2014":"Pithiviers"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4529';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châlette-sur-Loing',
    canton_name_2014_normalized = 'chalette sur loing',
    department_code = '45',
    source_payload = '{"canton_code_2014":"4533","canton_name_2014":"Châlette-sur-Loing"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4533';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chécy',
    canton_name_2014_normalized = 'checy',
    department_code = '45',
    source_payload = '{"canton_code_2014":"4538","canton_name_2014":"Chécy"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4538';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ingré',
    canton_name_2014_normalized = 'ingre',
    department_code = '45',
    source_payload = '{"canton_code_2014":"4539","canton_name_2014":"Ingré"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4539';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '45',
    source_payload = '{"canton_code_2014":"4599","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4599';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cahors-Nord-Est',
    canton_name_2014_normalized = 'cahors nord est',
    department_code = '46',
    source_payload = '{"canton_code_2014":"4602","canton_name_2014":"Cahors-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4602';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cahors-Sud',
    canton_name_2014_normalized = 'cahors sud',
    department_code = '46',
    source_payload = '{"canton_code_2014":"4603","canton_name_2014":"Cahors-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4603';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Figeac-Est',
    canton_name_2014_normalized = 'figeac est',
    department_code = '46',
    source_payload = '{"canton_code_2014":"4608","canton_name_2014":"Figeac-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4608';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Figeac-Ouest',
    canton_name_2014_normalized = 'figeac ouest',
    department_code = '46',
    source_payload = '{"canton_code_2014":"4609","canton_name_2014":"Figeac-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4609';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Gourdon',
    canton_name_2014_normalized = 'gourdon',
    department_code = '46',
    source_payload = '{"canton_code_2014":"4610","canton_name_2014":"Gourdon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4610';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Latronquière',
    canton_name_2014_normalized = 'latronquiere',
    department_code = '46',
    source_payload = '{"canton_code_2014":"4615","canton_name_2014":"Latronquière"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4615';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lauzès',
    canton_name_2014_normalized = 'lauzes',
    department_code = '46',
    source_payload = '{"canton_code_2014":"4616","canton_name_2014":"Lauzès"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4616';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Puy-l''Évêque',
    canton_name_2014_normalized = 'puy l eveque',
    department_code = '46',
    source_payload = '{"canton_code_2014":"4623","canton_name_2014":"Puy-l''Évêque"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4623';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Céré',
    canton_name_2014_normalized = 'saint cere',
    department_code = '46',
    source_payload = '{"canton_code_2014":"4624","canton_name_2014":"Saint-Céré"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4624';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Géry',
    canton_name_2014_normalized = 'saint gery',
    department_code = '46',
    source_payload = '{"canton_code_2014":"4626","canton_name_2014":"Saint-Géry"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4626';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cahors-Nord-Ouest',
    canton_name_2014_normalized = 'cahors nord ouest',
    department_code = '46',
    source_payload = '{"canton_code_2014":"4631","canton_name_2014":"Cahors-Nord-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4631';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '46',
    source_payload = '{"canton_code_2014":"4698","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4698';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '46',
    source_payload = '{"canton_code_2014":"4699","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4699';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Agen-Nord-Est',
    canton_name_2014_normalized = 'agen nord est',
    department_code = '47',
    source_payload = '{"canton_code_2014":"4702","canton_name_2014":"Agen-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4702';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Castillonnès',
    canton_name_2014_normalized = 'castillonnes',
    department_code = '47',
    source_payload = '{"canton_code_2014":"4709","canton_name_2014":"Castillonnès"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4709';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Houeillès',
    canton_name_2014_normalized = 'houeilles',
    department_code = '47',
    source_payload = '{"canton_code_2014":"4714","canton_name_2014":"Houeillès"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4714';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Marmande-Est',
    canton_name_2014_normalized = 'marmande est',
    department_code = '47',
    source_payload = '{"canton_code_2014":"4719","canton_name_2014":"Marmande-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4719';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mézin',
    canton_name_2014_normalized = 'mezin',
    department_code = '47',
    source_payload = '{"canton_code_2014":"4722","canton_name_2014":"Mézin"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4722';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Nérac',
    canton_name_2014_normalized = 'nerac',
    department_code = '47',
    source_payload = '{"canton_code_2014":"4725","canton_name_2014":"Nérac"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4725';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Villeneuve-sur-Lot-Nord',
    canton_name_2014_normalized = 'villeneuve sur lot nord',
    department_code = '47',
    source_payload = '{"canton_code_2014":"4734","canton_name_2014":"Villeneuve-sur-Lot-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4734';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Villeréal',
    canton_name_2014_normalized = 'villereal',
    department_code = '47',
    source_payload = '{"canton_code_2014":"4735","canton_name_2014":"Villeréal"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4735';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Agen-Nord',
    canton_name_2014_normalized = 'agen nord',
    department_code = '47',
    source_payload = '{"canton_code_2014":"4736","canton_name_2014":"Agen-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4736';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Agen-Ouest',
    canton_name_2014_normalized = 'agen ouest',
    department_code = '47',
    source_payload = '{"canton_code_2014":"4737","canton_name_2014":"Agen-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4737';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Marmande-Ouest',
    canton_name_2014_normalized = 'marmande ouest',
    department_code = '47',
    source_payload = '{"canton_code_2014":"4738","canton_name_2014":"Marmande-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4738';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Villeneuve-sur-Lot-Sud',
    canton_name_2014_normalized = 'villeneuve sur lot sud',
    department_code = '47',
    source_payload = '{"canton_code_2014":"4739","canton_name_2014":"Villeneuve-sur-Lot-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4739';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Agen-Sud-Est',
    canton_name_2014_normalized = 'agen sud est',
    department_code = '47',
    source_payload = '{"canton_code_2014":"4740","canton_name_2014":"Agen-Sud-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4740';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '47',
    source_payload = '{"canton_code_2014":"4797","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4797';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '47',
    source_payload = '{"canton_code_2014":"4798","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4798';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '47',
    source_payload = '{"canton_code_2014":"4799","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4799';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Barre-des-Cévennes',
    canton_name_2014_normalized = 'barre des cevennes',
    department_code = '48',
    source_payload = '{"canton_code_2014":"4802","canton_name_2014":"Barre-des-Cévennes"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4802';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteauneuf-de-Randon',
    canton_name_2014_normalized = 'chateauneuf de randon',
    department_code = '48',
    source_payload = '{"canton_code_2014":"4806","canton_name_2014":"Châteauneuf-de-Randon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4806';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Florac',
    canton_name_2014_normalized = 'florac',
    department_code = '48',
    source_payload = '{"canton_code_2014":"4807","canton_name_2014":"Florac"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4807';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mende-Nord',
    canton_name_2014_normalized = 'mende nord',
    department_code = '48',
    source_payload = '{"canton_code_2014":"4814","canton_name_2014":"Mende-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4814';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Chély-d''Apcher',
    canton_name_2014_normalized = 'saint chely d apcher',
    department_code = '48',
    source_payload = '{"canton_code_2014":"4820","canton_name_2014":"Saint-Chély-d''Apcher"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4820';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mende-Sud',
    canton_name_2014_normalized = 'mende sud',
    department_code = '48',
    source_payload = '{"canton_code_2014":"4825","canton_name_2014":"Mende-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4825';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '48',
    source_payload = '{"canton_code_2014":"4899","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4899';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Angers-Nord-Est',
    canton_name_2014_normalized = 'angers nord est',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4901","canton_name_2014":"Angers-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4901';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Angers-Est',
    canton_name_2014_normalized = 'angers est',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4902","canton_name_2014":"Angers-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4902';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Baugé-en-Anjou',
    canton_name_2014_normalized = 'bauge en anjou',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4904","canton_name_2014":"Baugé-en-Anjou"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4904';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Beaufort-en-Vallée',
    canton_name_2014_normalized = 'beaufort en vallee',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4905","canton_name_2014":"Beaufort-en-Vallée"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4905';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Beaupréau',
    canton_name_2014_normalized = 'beaupreau',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4906","canton_name_2014":"Beaupréau"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4906';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Candé',
    canton_name_2014_normalized = 'cande',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4907","canton_name_2014":"Candé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4907';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteauneuf-sur-Sarthe',
    canton_name_2014_normalized = 'chateauneuf sur sarthe',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4910","canton_name_2014":"Châteauneuf-sur-Sarthe"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4910';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chemillé-Melay',
    canton_name_2014_normalized = 'chemille melay',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4911","canton_name_2014":"Chemillé-Melay"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4911';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cholet  2e  Canton',
    canton_name_2014_normalized = 'cholet 2e canton',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4912","canton_name_2014":"Cholet  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4912';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Doué-la-Fontaine',
    canton_name_2014_normalized = 'doue la fontaine',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4913","canton_name_2014":"Doué-la-Fontaine"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4913';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Longué-Jumelles',
    canton_name_2014_normalized = 'longue jumelles',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4917","canton_name_2014":"Longué-Jumelles"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4917';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Louroux-Béconnais',
    canton_name_2014_normalized = 'louroux beconnais',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4918","canton_name_2014":"Louroux-Béconnais"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4918';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montfaucon-Montigné',
    canton_name_2014_normalized = 'montfaucon montigne',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4919","canton_name_2014":"Montfaucon-Montigné"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4919';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ponts-de-Cé',
    canton_name_2014_normalized = 'ponts de ce',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4923","canton_name_2014":"Ponts-de-Cé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4923';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pouancé',
    canton_name_2014_normalized = 'pouance',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4924","canton_name_2014":"Pouancé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4924';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saumur-Nord',
    canton_name_2014_normalized = 'saumur nord',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4928","canton_name_2014":"Saumur-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4928';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saumur-Sud',
    canton_name_2014_normalized = 'saumur sud',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4929","canton_name_2014":"Saumur-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4929';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Segré',
    canton_name_2014_normalized = 'segre',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4930","canton_name_2014":"Segré"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4930';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Thouarcé',
    canton_name_2014_normalized = 'thouarce',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4932","canton_name_2014":"Thouarcé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4932';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Tiercé',
    canton_name_2014_normalized = 'tierce',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4933","canton_name_2014":"Tiercé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4933';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cholet  1er Canton',
    canton_name_2014_normalized = 'cholet 1er canton',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4935","canton_name_2014":"Cholet  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4935';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Angers-Trélazé',
    canton_name_2014_normalized = 'angers trelaze',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4936","canton_name_2014":"Angers-Trélazé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4936';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Angers-Ouest',
    canton_name_2014_normalized = 'angers ouest',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4938","canton_name_2014":"Angers-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4938';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Angers-Nord',
    canton_name_2014_normalized = 'angers nord',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4939","canton_name_2014":"Angers-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4939';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cholet  3e  Canton',
    canton_name_2014_normalized = 'cholet 3e canton',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4940","canton_name_2014":"Cholet  3e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4940';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Angers-Nord-Ouest',
    canton_name_2014_normalized = 'angers nord ouest',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4941","canton_name_2014":"Angers-Nord-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4941';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4997","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4997';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4998","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4998';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '49',
    source_payload = '{"canton_code_2014":"4999","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '4999';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Brécey',
    canton_name_2014_normalized = 'brecey',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5005","canton_name_2014":"Brécey"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5005';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bréhal',
    canton_name_2014_normalized = 'brehal',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5006","canton_name_2014":"Bréhal"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5006';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Coutances',
    canton_name_2014_normalized = 'coutances',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5012","canton_name_2014":"Coutances"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5012';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cherbourg-Octeville-Sud-Ouest',
    canton_name_2014_normalized = 'cherbourg octeville sud ouest',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5025","canton_name_2014":"Cherbourg-Octeville-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5025';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Périers',
    canton_name_2014_normalized = 'periers',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5027","canton_name_2014":"Périers"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5027';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Hilaire-du-Harcouët',
    canton_name_2014_normalized = 'saint hilaire du harcouet',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5032","canton_name_2014":"Saint-Hilaire-du-Harcouët"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5032';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Lô-Est',
    canton_name_2014_normalized = 'saint lo est',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5035","canton_name_2014":"Saint-Lô-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5035';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sainte-Mère-Église',
    canton_name_2014_normalized = 'sainte mere eglise',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5037","canton_name_2014":"Sainte-Mère-Église"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5037';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Pierre-Église',
    canton_name_2014_normalized = 'saint pierre eglise',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5038","canton_name_2014":"Saint-Pierre-Église"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5038';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Villedieu-les-Poêles',
    canton_name_2014_normalized = 'villedieu les poeles',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5048","canton_name_2014":"Villedieu-les-Poêles"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5048';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Équeurdreville-Hainneville',
    canton_name_2014_normalized = 'equeurdreville hainneville',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5050","canton_name_2014":"Équeurdreville-Hainneville"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5050';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Lô-Ouest',
    canton_name_2014_normalized = 'saint lo ouest',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5052","canton_name_2014":"Saint-Lô-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5052';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5095","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5095';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5096","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5096';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5097","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5097';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5098","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5098';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '50',
    source_payload = '{"canton_code_2014":"5099","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5099';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtillon-sur-Marne',
    canton_name_2014_normalized = 'chatillon sur marne',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5107","canton_name_2014":"Châtillon-sur-Marne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5107';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Écury-sur-Coole',
    canton_name_2014_normalized = 'ecury sur coole',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5110","canton_name_2014":"Écury-sur-Coole"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5110';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fère-Champenoise',
    canton_name_2014_normalized = 'fere champenoise',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5113","canton_name_2014":"Fère-Champenoise"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5113';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Reims  1er Canton',
    canton_name_2014_normalized = 'reims 1er canton',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5119","canton_name_2014":"Reims  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5119';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Reims  4e  Canton',
    canton_name_2014_normalized = 'reims 4e canton',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5122","canton_name_2014":"Reims  4e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5122';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sainte-Menehould',
    canton_name_2014_normalized = 'sainte menehould',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5123","canton_name_2014":"Sainte-Menehould"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5123';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sézanne',
    canton_name_2014_normalized = 'sezanne',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5125","canton_name_2014":"Sézanne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5125';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Thiéblemont-Farémont',
    canton_name_2014_normalized = 'thieblemont faremont',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5128","canton_name_2014":"Thiéblemont-Farémont"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5128';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vitry-le-François-Est',
    canton_name_2014_normalized = 'vitry le francois est',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5133","canton_name_2014":"Vitry-le-François-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5133';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vitry-le-François-Ouest',
    canton_name_2014_normalized = 'vitry le francois ouest',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5134","canton_name_2014":"Vitry-le-François-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5134';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châlons-en-Champagne  2e  Canton',
    canton_name_2014_normalized = 'chalons en champagne 2e canton',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5135","canton_name_2014":"Châlons-en-Champagne  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5135';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châlons-en-Champagne  3e  Canton',
    canton_name_2014_normalized = 'chalons en champagne 3e canton',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5136","canton_name_2014":"Châlons-en-Champagne  3e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5136';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Épernay  2e  Canton',
    canton_name_2014_normalized = 'epernay 2e canton',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5137","canton_name_2014":"Épernay  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5137';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Reims  5e  Canton',
    canton_name_2014_normalized = 'reims 5e canton',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5138","canton_name_2014":"Reims  5e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5138';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Reims  7e  Canton',
    canton_name_2014_normalized = 'reims 7e canton',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5140","canton_name_2014":"Reims  7e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5140';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Reims  8e  Canton',
    canton_name_2014_normalized = 'reims 8e canton',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5141","canton_name_2014":"Reims  8e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5141';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châlons-en-Champagne  4e  Canton',
    canton_name_2014_normalized = 'chalons en champagne 4e canton',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5143","canton_name_2014":"Châlons-en-Champagne  4e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5143';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5196","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5196';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5197","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5197';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5198","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5198';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '51',
    source_payload = '{"canton_code_2014":"5199","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5199';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteauvillain',
    canton_name_2014_normalized = 'chateauvillain',
    department_code = '52',
    source_payload = '{"canton_code_2014":"5206","canton_name_2014":"Châteauvillain"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5206';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chaumont-Nord',
    canton_name_2014_normalized = 'chaumont nord',
    department_code = '52',
    source_payload = '{"canton_code_2014":"5207","canton_name_2014":"Chaumont-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5207';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Doulevant-le-Château',
    canton_name_2014_normalized = 'doulevant le chateau',
    department_code = '52',
    source_payload = '{"canton_code_2014":"5211","canton_name_2014":"Doulevant-le-Château"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5211';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Laferté-sur-Amance',
    canton_name_2014_normalized = 'laferte sur amance',
    department_code = '52',
    source_payload = '{"canton_code_2014":"5215","canton_name_2014":"Laferté-sur-Amance"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5215';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Langres',
    canton_name_2014_normalized = 'langres',
    department_code = '52',
    source_payload = '{"canton_code_2014":"5216","canton_name_2014":"Langres"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5216';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Neuilly-l''Évêque',
    canton_name_2014_normalized = 'neuilly l eveque',
    department_code = '52',
    source_payload = '{"canton_code_2014":"5220","canton_name_2014":"Neuilly-l''Évêque"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5220';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chaumont-Sud',
    canton_name_2014_normalized = 'chaumont sud',
    department_code = '52',
    source_payload = '{"canton_code_2014":"5229","canton_name_2014":"Chaumont-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5229';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Dizier-Nord-Est',
    canton_name_2014_normalized = 'saint dizier nord est',
    department_code = '52',
    source_payload = '{"canton_code_2014":"5230","canton_name_2014":"Saint-Dizier-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5230';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Dizier-Ouest',
    canton_name_2014_normalized = 'saint dizier ouest',
    department_code = '52',
    source_payload = '{"canton_code_2014":"5231","canton_name_2014":"Saint-Dizier-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5231';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Dizier-Sud-Est',
    canton_name_2014_normalized = 'saint dizier sud est',
    department_code = '52',
    source_payload = '{"canton_code_2014":"5232","canton_name_2014":"Saint-Dizier-Sud-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5232';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '52',
    source_payload = '{"canton_code_2014":"5285","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5285';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '52',
    source_payload = '{"canton_code_2014":"5286","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5286';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ambrières-les-Vallées',
    canton_name_2014_normalized = 'ambrieres les vallees',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5301","canton_name_2014":"Ambrières-les-Vallées"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5301';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Argentré',
    canton_name_2014_normalized = 'argentre',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5302","canton_name_2014":"Argentré"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5302';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bierné',
    canton_name_2014_normalized = 'bierne',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5304","canton_name_2014":"Bierné"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5304';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Château-Gontier-Ouest',
    canton_name_2014_normalized = 'chateau gontier ouest',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5306","canton_name_2014":"Château-Gontier-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5306';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cossé-le-Vivien',
    canton_name_2014_normalized = 'cosse le vivien',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5307","canton_name_2014":"Cossé-le-Vivien"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5307';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ernée',
    canton_name_2014_normalized = 'ernee',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5310","canton_name_2014":"Ernée"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5310';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Évron',
    canton_name_2014_normalized = 'evron',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5311","canton_name_2014":"Évron"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5311';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Grez-en-Bouère',
    canton_name_2014_normalized = 'grez en bouere',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5313","canton_name_2014":"Grez-en-Bouère"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5313';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lassay-les-Châteaux',
    canton_name_2014_normalized = 'lassay les chateaux',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5316","canton_name_2014":"Lassay-les-Châteaux"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5316';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Laval-Nord-Est',
    canton_name_2014_normalized = 'laval nord est',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5317","canton_name_2014":"Laval-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5317';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mayenne-Est',
    canton_name_2014_normalized = 'mayenne est',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5320","canton_name_2014":"Mayenne-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5320';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mayenne-Ouest',
    canton_name_2014_normalized = 'mayenne ouest',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5321","canton_name_2014":"Mayenne-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5321';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montsûrs',
    canton_name_2014_normalized = 'montsurs',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5323","canton_name_2014":"Montsûrs"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5323';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pré-en-Pail',
    canton_name_2014_normalized = 'pre en pail',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5324","canton_name_2014":"Pré-en-Pail"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5324';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Aignan-sur-Roë',
    canton_name_2014_normalized = 'saint aignan sur roe',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5325","canton_name_2014":"Saint-Aignan-sur-Roë"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5325';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Laval-Est',
    canton_name_2014_normalized = 'laval est',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5328","canton_name_2014":"Laval-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5328';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Château-Gontier-Est',
    canton_name_2014_normalized = 'chateau gontier est',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5331","canton_name_2014":"Château-Gontier-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5331';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5397","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5397';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5398","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5398';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '53',
    source_payload = '{"canton_code_2014":"5399","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5399';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Blâmont',
    canton_name_2014_normalized = 'blamont',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5406","canton_name_2014":"Blâmont"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5406';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Briey',
    canton_name_2014_normalized = 'briey',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5407","canton_name_2014":"Briey"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5407';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chambley-Bussières',
    canton_name_2014_normalized = 'chambley bussieres',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5408","canton_name_2014":"Chambley-Bussières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5408';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Domèvre-en-Haye',
    canton_name_2014_normalized = 'domevre en haye',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5412","canton_name_2014":"Domèvre-en-Haye"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5412';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Gerbéviller',
    canton_name_2014_normalized = 'gerbeviller',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5413","canton_name_2014":"Gerbéviller"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5413';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Haroué',
    canton_name_2014_normalized = 'haroue',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5414","canton_name_2014":"Haroué"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5414';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lunéville-Nord',
    canton_name_2014_normalized = 'luneville nord',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5417","canton_name_2014":"Lunéville-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5417';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lunéville-Sud',
    canton_name_2014_normalized = 'luneville sud',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5418","canton_name_2014":"Lunéville-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5418';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pont-à-Mousson',
    canton_name_2014_normalized = 'pont a mousson',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5424","canton_name_2014":"Pont-à-Mousson"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5424';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Thiaucourt-Regniéville',
    canton_name_2014_normalized = 'thiaucourt regnieville',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5426","canton_name_2014":"Thiaucourt-Regniéville"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5426';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Toul-Nord',
    canton_name_2014_normalized = 'toul nord',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5427","canton_name_2014":"Toul-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5427';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Toul-Sud',
    canton_name_2014_normalized = 'toul sud',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5428","canton_name_2014":"Toul-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5428';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vézelise',
    canton_name_2014_normalized = 'vezelise',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5429","canton_name_2014":"Vézelise"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5429';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Homécourt',
    canton_name_2014_normalized = 'homecourt',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5431","canton_name_2014":"Homécourt"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5431';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Malzéville',
    canton_name_2014_normalized = 'malzeville',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5442","canton_name_2014":"Malzéville"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5442';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5496","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5496';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5497","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5497';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5498","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5498';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '54',
    source_payload = '{"canton_code_2014":"5499","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5499';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bar-le-Duc-Nord',
    canton_name_2014_normalized = 'bar le duc nord',
    department_code = '55',
    source_payload = '{"canton_code_2014":"5502","canton_name_2014":"Bar-le-Duc-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5502';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Commercy',
    canton_name_2014_normalized = 'commercy',
    department_code = '55',
    source_payload = '{"canton_code_2014":"5505","canton_name_2014":"Commercy"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5505';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Étain',
    canton_name_2014_normalized = 'etain',
    department_code = '55',
    source_payload = '{"canton_code_2014":"5508","canton_name_2014":"Étain"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5508';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fresnes-en-Woëvre',
    canton_name_2014_normalized = 'fresnes en woevre',
    department_code = '55',
    source_payload = '{"canton_code_2014":"5509","canton_name_2014":"Fresnes-en-Woëvre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5509';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Gondrecourt-le-Château',
    canton_name_2014_normalized = 'gondrecourt le chateau',
    department_code = '55',
    source_payload = '{"canton_code_2014":"5510","canton_name_2014":"Gondrecourt-le-Château"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5510';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montmédy',
    canton_name_2014_normalized = 'montmedy',
    department_code = '55',
    source_payload = '{"canton_code_2014":"5514","canton_name_2014":"Montmédy"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5514';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Verdun-Est',
    canton_name_2014_normalized = 'verdun est',
    department_code = '55',
    source_payload = '{"canton_code_2014":"5526","canton_name_2014":"Verdun-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5526';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vigneulles-lès-Hattonchâtel',
    canton_name_2014_normalized = 'vigneulles les hattonchatel',
    department_code = '55',
    source_payload = '{"canton_code_2014":"5527","canton_name_2014":"Vigneulles-lès-Hattonchâtel"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5527';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bar-le-Duc-Sud',
    canton_name_2014_normalized = 'bar le duc sud',
    department_code = '55',
    source_payload = '{"canton_code_2014":"5529","canton_name_2014":"Bar-le-Duc-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5529';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Verdun-Ouest',
    canton_name_2014_normalized = 'verdun ouest',
    department_code = '55',
    source_payload = '{"canton_code_2014":"5530","canton_name_2014":"Verdun-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5530';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Verdun-Centre',
    canton_name_2014_normalized = 'verdun centre',
    department_code = '55',
    source_payload = '{"canton_code_2014":"5531","canton_name_2014":"Verdun-Centre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5531';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '55',
    source_payload = '{"canton_code_2014":"5592","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5592';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '55',
    source_payload = '{"canton_code_2014":"5593","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5593';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cléguérec',
    canton_name_2014_normalized = 'cleguerec',
    department_code = '56',
    source_payload = '{"canton_code_2014":"5605","canton_name_2014":"Cléguérec"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5605';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Faouët',
    canton_name_2014_normalized = 'faouet',
    department_code = '56',
    source_payload = '{"canton_code_2014":"5607","canton_name_2014":"Faouët"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5607';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Guémené-sur-Scorff',
    canton_name_2014_normalized = 'guemene sur scorff',
    department_code = '56',
    source_payload = '{"canton_code_2014":"5612","canton_name_2014":"Guémené-sur-Scorff"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5612';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Locminé',
    canton_name_2014_normalized = 'locmine',
    department_code = '56',
    source_payload = '{"canton_code_2014":"5616","canton_name_2014":"Locminé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5616';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Belle-Île',
    canton_name_2014_normalized = 'belle ile',
    department_code = '56',
    source_payload = '{"canton_code_2014":"5622","canton_name_2014":"Belle-Île"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5622';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ploërmel',
    canton_name_2014_normalized = 'ploermel',
    department_code = '56',
    source_payload = '{"canton_code_2014":"5623","canton_name_2014":"Ploërmel"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5623';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pontivy',
    canton_name_2014_normalized = 'pontivy',
    department_code = '56',
    source_payload = '{"canton_code_2014":"5626","canton_name_2014":"Pontivy"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5626';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Jean-Brévelay',
    canton_name_2014_normalized = 'saint jean brevelay',
    department_code = '56',
    source_payload = '{"canton_code_2014":"5634","canton_name_2014":"Saint-Jean-Brévelay"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5634';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Trinité-Porhoët',
    canton_name_2014_normalized = 'trinite porhoet',
    department_code = '56',
    source_payload = '{"canton_code_2014":"5636","canton_name_2014":"Trinité-Porhoët"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5636';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vannes-Est',
    canton_name_2014_normalized = 'vannes est',
    department_code = '56',
    source_payload = '{"canton_code_2014":"5637","canton_name_2014":"Vannes-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5637';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vannes-Ouest',
    canton_name_2014_normalized = 'vannes ouest',
    department_code = '56',
    source_payload = '{"canton_code_2014":"5638","canton_name_2014":"Vannes-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5638';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '56',
    source_payload = '{"canton_code_2014":"5698","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5698';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '56',
    source_payload = '{"canton_code_2014":"5699","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5699';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Boulay-Moselle',
    canton_name_2014_normalized = 'boulay moselle',
    department_code = '57',
    source_payload = '{"canton_code_2014":"5703","canton_name_2014":"Boulay-Moselle"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5703';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Château-Salins',
    canton_name_2014_normalized = 'chateau salins',
    department_code = '57',
    source_payload = '{"canton_code_2014":"5706","canton_name_2014":"Château-Salins"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5706';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fénétrange',
    canton_name_2014_normalized = 'fenetrange',
    department_code = '57',
    source_payload = '{"canton_code_2014":"5710","canton_name_2014":"Fénétrange"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5710';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montigny-lès-Metz',
    canton_name_2014_normalized = 'montigny les metz',
    department_code = '57',
    source_payload = '{"canton_code_2014":"5720","canton_name_2014":"Montigny-lès-Metz"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5720';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Réchicourt-le-Château',
    canton_name_2014_normalized = 'rechicourt le chateau',
    department_code = '57',
    source_payload = '{"canton_code_2014":"5725","canton_name_2014":"Réchicourt-le-Château"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5725';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rohrbach-lès-Bitche',
    canton_name_2014_normalized = 'rohrbach les bitche',
    department_code = '57',
    source_payload = '{"canton_code_2014":"5726","canton_name_2014":"Rohrbach-lès-Bitche"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5726';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Avold  1er Canton',
    canton_name_2014_normalized = 'saint avold 1er canton',
    department_code = '57',
    source_payload = '{"canton_code_2014":"5727","canton_name_2014":"Saint-Avold  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5727';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sarrebourg',
    canton_name_2014_normalized = 'sarrebourg',
    department_code = '57',
    source_payload = '{"canton_code_2014":"5729","canton_name_2014":"Sarrebourg"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5729';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Maizières-lès-Metz',
    canton_name_2014_normalized = 'maizieres les metz',
    department_code = '57',
    source_payload = '{"canton_code_2014":"5743","canton_name_2014":"Maizières-lès-Metz"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5743';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Behren-lès-Forbach',
    canton_name_2014_normalized = 'behren les forbach',
    department_code = '57',
    source_payload = '{"canton_code_2014":"5747","canton_name_2014":"Behren-lès-Forbach"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5747';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Avold  2e  Canton',
    canton_name_2014_normalized = 'saint avold 2e canton',
    department_code = '57',
    source_payload = '{"canton_code_2014":"5749","canton_name_2014":"Saint-Avold  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5749';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sarreguemines-Campagne',
    canton_name_2014_normalized = 'sarreguemines campagne',
    department_code = '57',
    source_payload = '{"canton_code_2014":"5750","canton_name_2014":"Sarreguemines-Campagne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5750';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '57',
    source_payload = '{"canton_code_2014":"5796","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5796';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '57',
    source_payload = '{"canton_code_2014":"5797","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5797';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '57',
    source_payload = '{"canton_code_2014":"5798","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5798';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '57',
    source_payload = '{"canton_code_2014":"5799","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5799';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Charité-sur-Loire',
    canton_name_2014_normalized = 'charite sur loire',
    department_code = '58',
    source_payload = '{"canton_code_2014":"5802","canton_name_2014":"Charité-sur-Loire"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5802';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Château-Chinon (Ville)',
    canton_name_2014_normalized = 'chateau chinon ville',
    department_code = '58',
    source_payload = '{"canton_code_2014":"5803","canton_name_2014":"Château-Chinon (Ville)"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5803';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtillon-en-Bazois',
    canton_name_2014_normalized = 'chatillon en bazois',
    department_code = '58',
    source_payload = '{"canton_code_2014":"5804","canton_name_2014":"Châtillon-en-Bazois"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5804';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Clamecy',
    canton_name_2014_normalized = 'clamecy',
    department_code = '58',
    source_payload = '{"canton_code_2014":"5805","canton_name_2014":"Clamecy"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5805';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cosne-Cours-sur-Loire-Sud',
    canton_name_2014_normalized = 'cosne cours sur loire sud',
    department_code = '58',
    source_payload = '{"canton_code_2014":"5807","canton_name_2014":"Cosne-Cours-sur-Loire-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5807';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Prémery',
    canton_name_2014_normalized = 'premery',
    department_code = '58',
    source_payload = '{"canton_code_2014":"5819","canton_name_2014":"Prémery"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5819';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Pierre-le-Moûtier',
    canton_name_2014_normalized = 'saint pierre le moutier',
    department_code = '58',
    source_payload = '{"canton_code_2014":"5822","canton_name_2014":"Saint-Pierre-le-Moûtier"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5822';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Guérigny',
    canton_name_2014_normalized = 'guerigny',
    department_code = '58',
    source_payload = '{"canton_code_2014":"5826","canton_name_2014":"Guérigny"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5826';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Nevers-Nord',
    canton_name_2014_normalized = 'nevers nord',
    department_code = '58',
    source_payload = '{"canton_code_2014":"5828","canton_name_2014":"Nevers-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5828';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Nevers-Est',
    canton_name_2014_normalized = 'nevers est',
    department_code = '58',
    source_payload = '{"canton_code_2014":"5829","canton_name_2014":"Nevers-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5829';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Nevers-Sud',
    canton_name_2014_normalized = 'nevers sud',
    department_code = '58',
    source_payload = '{"canton_code_2014":"5830","canton_name_2014":"Nevers-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5830';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cosne-Cours-sur-Loire-Nord',
    canton_name_2014_normalized = 'cosne cours sur loire nord',
    department_code = '58',
    source_payload = '{"canton_code_2014":"5831","canton_name_2014":"Cosne-Cours-sur-Loire-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5831';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '58',
    source_payload = '{"canton_code_2014":"5898","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5898';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '58',
    source_payload = '{"canton_code_2014":"5899","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5899';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Armentières',
    canton_name_2014_normalized = 'armentieres',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5902","canton_name_2014":"Armentières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5902';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Avesnes-sur-Helpe-Nord',
    canton_name_2014_normalized = 'avesnes sur helpe nord',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5903","canton_name_2014":"Avesnes-sur-Helpe-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5903';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Avesnes-sur-Helpe-Sud',
    canton_name_2014_normalized = 'avesnes sur helpe sud',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5904","canton_name_2014":"Avesnes-sur-Helpe-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5904';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bailleul-Nord-Est',
    canton_name_2014_normalized = 'bailleul nord est',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5905","canton_name_2014":"Bailleul-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5905';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bailleul-Sud-Ouest',
    canton_name_2014_normalized = 'bailleul sud ouest',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5906","canton_name_2014":"Bailleul-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5906';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bassée',
    canton_name_2014_normalized = 'bassee',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5907","canton_name_2014":"Bassée"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5907';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cambrai-Est',
    canton_name_2014_normalized = 'cambrai est',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5913","canton_name_2014":"Cambrai-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5913';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cambrai-Ouest',
    canton_name_2014_normalized = 'cambrai ouest',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5914","canton_name_2014":"Cambrai-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5914';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Carnières',
    canton_name_2014_normalized = 'carnieres',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5915","canton_name_2014":"Carnières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5915';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cateau-Cambrésis',
    canton_name_2014_normalized = 'cateau cambresis',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5917","canton_name_2014":"Cateau-Cambrésis"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5917';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Condé-sur-l''Escaut',
    canton_name_2014_normalized = 'conde sur l escaut',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5919","canton_name_2014":"Condé-sur-l''Escaut"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5919';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Douai-Nord',
    canton_name_2014_normalized = 'douai nord',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5922","canton_name_2014":"Douai-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5922';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Douai-Sud-Ouest',
    canton_name_2014_normalized = 'douai sud ouest',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5923","canton_name_2014":"Douai-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5923';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Douai-Sud',
    canton_name_2014_normalized = 'douai sud',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5924","canton_name_2014":"Douai-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5924';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dunkerque-Est',
    canton_name_2014_normalized = 'dunkerque est',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5925","canton_name_2014":"Dunkerque-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5925';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dunkerque-Ouest',
    canton_name_2014_normalized = 'dunkerque ouest',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5926","canton_name_2014":"Dunkerque-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5926';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Hazebrouck-Nord',
    canton_name_2014_normalized = 'hazebrouck nord',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5929","canton_name_2014":"Hazebrouck-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5929';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Hazebrouck-Sud',
    canton_name_2014_normalized = 'hazebrouck sud',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5930","canton_name_2014":"Hazebrouck-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5930';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lille-Nord',
    canton_name_2014_normalized = 'lille nord',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5936","canton_name_2014":"Lille-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5936';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lille-Nord-Est',
    canton_name_2014_normalized = 'lille nord est',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5937","canton_name_2014":"Lille-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5937';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lille-Ouest',
    canton_name_2014_normalized = 'lille ouest',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5938","canton_name_2014":"Lille-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5938';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lille-Sud-Est',
    canton_name_2014_normalized = 'lille sud est',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5940","canton_name_2014":"Lille-Sud-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5940';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Maubeuge-Nord',
    canton_name_2014_normalized = 'maubeuge nord',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5944","canton_name_2014":"Maubeuge-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5944';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Maubeuge-Sud',
    canton_name_2014_normalized = 'maubeuge sud',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5945","canton_name_2014":"Maubeuge-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5945';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pont-à-Marcq',
    canton_name_2014_normalized = 'pont a marcq',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5948","canton_name_2014":"Pont-à-Marcq"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5948';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Quesnoy-Est',
    canton_name_2014_normalized = 'quesnoy est',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5949","canton_name_2014":"Quesnoy-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5949';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Quesnoy-Ouest',
    canton_name_2014_normalized = 'quesnoy ouest',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5950","canton_name_2014":"Quesnoy-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5950';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Quesnoy-sur-Deûle',
    canton_name_2014_normalized = 'quesnoy sur deule',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5951","canton_name_2014":"Quesnoy-sur-Deûle"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5951';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Roubaix-Ouest',
    canton_name_2014_normalized = 'roubaix ouest',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5954","canton_name_2014":"Roubaix-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5954';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Amand-les-Eaux-Rive droite',
    canton_name_2014_normalized = 'saint amand les eaux rive droite',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5955","canton_name_2014":"Saint-Amand-les-Eaux-Rive droite"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5955';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Amand-les-Eaux-Rive gauche',
    canton_name_2014_normalized = 'saint amand les eaux rive gauche',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5956","canton_name_2014":"Saint-Amand-les-Eaux-Rive gauche"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5956';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Seclin-Sud',
    canton_name_2014_normalized = 'seclin sud',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5957","canton_name_2014":"Seclin-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5957';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Solre-le-Château',
    canton_name_2014_normalized = 'solre le chateau',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5959","canton_name_2014":"Solre-le-Château"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5959';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Tourcoing-Nord',
    canton_name_2014_normalized = 'tourcoing nord',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5961","canton_name_2014":"Tourcoing-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5961';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Tourcoing-Nord-Est',
    canton_name_2014_normalized = 'tourcoing nord est',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5962","canton_name_2014":"Tourcoing-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5962';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Tourcoing-Sud',
    canton_name_2014_normalized = 'tourcoing sud',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5963","canton_name_2014":"Tourcoing-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5963';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Trélon',
    canton_name_2014_normalized = 'trelon',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5964","canton_name_2014":"Trélon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5964';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Valenciennes-Est',
    canton_name_2014_normalized = 'valenciennes est',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5965","canton_name_2014":"Valenciennes-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5965';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Valenciennes-Nord',
    canton_name_2014_normalized = 'valenciennes nord',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5966","canton_name_2014":"Valenciennes-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5966';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Valenciennes-Sud',
    canton_name_2014_normalized = 'valenciennes sud',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5967","canton_name_2014":"Valenciennes-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5967';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lomme',
    canton_name_2014_normalized = 'lomme',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5974","canton_name_2014":"Lomme"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5974';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Douai-Nord-Est',
    canton_name_2014_normalized = 'douai nord est',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5977","canton_name_2014":"Douai-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5977';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Seclin-Nord',
    canton_name_2014_normalized = 'seclin nord',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5978","canton_name_2014":"Seclin-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5978';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5984","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5984';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5985","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5985';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5986","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5986';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5987","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5987';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5988","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5988';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5989","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5989';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5990","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5990';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5991","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5991';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5992","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5992';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5993","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5993';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5994","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5994';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5995","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5995';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5996","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5996';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5997","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5997';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5998","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5998';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '59',
    source_payload = '{"canton_code_2014":"5999","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '5999';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Beauvais-Sud-Ouest',
    canton_name_2014_normalized = 'beauvais sud ouest',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6004","canton_name_2014":"Beauvais-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6004';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Clermont',
    canton_name_2014_normalized = 'clermont',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6008","canton_name_2014":"Clermont"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6008';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Compiègne-Nord',
    canton_name_2014_normalized = 'compiegne nord',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6009","canton_name_2014":"Compiègne-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6009';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Creil-Nogent-sur-Oise',
    canton_name_2014_normalized = 'creil nogent sur oise',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6011","canton_name_2014":"Creil-Nogent-sur-Oise"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6011';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Crépy-en-Valois',
    canton_name_2014_normalized = 'crepy en valois',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6012","canton_name_2014":"Crépy-en-Valois"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6012';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Crèvecoeur-le-Grand',
    canton_name_2014_normalized = 'crevecoeur le grand',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6013","canton_name_2014":"Crèvecoeur-le-Grand"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6013';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Estrées-Saint-Denis',
    canton_name_2014_normalized = 'estrees saint denis',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6014","canton_name_2014":"Estrées-Saint-Denis"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6014';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Méru',
    canton_name_2014_normalized = 'meru',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6023","canton_name_2014":"Méru"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6023';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ribécourt-Dreslincourt',
    canton_name_2014_normalized = 'ribecourt dreslincourt',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6032","canton_name_2014":"Ribécourt-Dreslincourt"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6032';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Just-en-Chaussée',
    canton_name_2014_normalized = 'saint just en chaussee',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6033","canton_name_2014":"Saint-Just-en-Chaussée"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6033';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Senlis',
    canton_name_2014_normalized = 'senlis',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6034","canton_name_2014":"Senlis"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6034';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Compiègne-Sud-Est',
    canton_name_2014_normalized = 'compiegne sud est',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6037","canton_name_2014":"Compiègne-Sud-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6037';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Beauvais-Nord-Ouest',
    canton_name_2014_normalized = 'beauvais nord ouest',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6040","canton_name_2014":"Beauvais-Nord-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6040';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Compiègne-Sud-Ouest',
    canton_name_2014_normalized = 'compiegne sud ouest',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6041","canton_name_2014":"Compiègne-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6041';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6097","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6097';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6098","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6098';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '60',
    source_payload = '{"canton_code_2014":"6099","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6099';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Alençon  1er Canton',
    canton_name_2014_normalized = 'alencon 1er canton',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6102","canton_name_2014":"Alençon  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6102';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Argentan-Est',
    canton_name_2014_normalized = 'argentan est',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6103","canton_name_2014":"Argentan-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6103';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bazoches-sur-Hoëne',
    canton_name_2014_normalized = 'bazoches sur hoene',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6105","canton_name_2014":"Bazoches-sur-Hoëne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6105';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bellême',
    canton_name_2014_normalized = 'belleme',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6106","canton_name_2014":"Bellême"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6106';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Écouché',
    canton_name_2014_normalized = 'ecouche',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6111","canton_name_2014":"Écouché"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6111';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ferté-Frênel',
    canton_name_2014_normalized = 'ferte frenel',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6113","canton_name_2014":"Ferté-Frênel"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6113';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ferté-Macé',
    canton_name_2014_normalized = 'ferte mace',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6114","canton_name_2014":"Ferté-Macé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6114';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Flers-Nord',
    canton_name_2014_normalized = 'flers nord',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6115","canton_name_2014":"Flers-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6115';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Gacé',
    canton_name_2014_normalized = 'gace',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6116","canton_name_2014":"Gacé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6116';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Aigle-Est',
    canton_name_2014_normalized = 'aigle est',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6118","canton_name_2014":"Aigle-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6118';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mêle-sur-Sarthe',
    canton_name_2014_normalized = 'mele sur sarthe',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6120","canton_name_2014":"Mêle-sur-Sarthe"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6120';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mortagne-au-Perche',
    canton_name_2014_normalized = 'mortagne au perche',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6123","canton_name_2014":"Mortagne-au-Perche"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6123';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mortrée',
    canton_name_2014_normalized = 'mortree',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6124","canton_name_2014":"Mortrée"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6124';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Nocé',
    canton_name_2014_normalized = 'noce',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6126","canton_name_2014":"Nocé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6126';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pervenchères',
    canton_name_2014_normalized = 'pervencheres',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6128","canton_name_2014":"Pervenchères"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6128';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Putanges-Pont-Écrepin',
    canton_name_2014_normalized = 'putanges pont ecrepin',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6129","canton_name_2014":"Putanges-Pont-Écrepin"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6129';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rémalard',
    canton_name_2014_normalized = 'remalard',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6130","canton_name_2014":"Rémalard"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6130';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sées',
    canton_name_2014_normalized = 'sees',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6131","canton_name_2014":"Sées"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6131';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Aigle-Ouest',
    canton_name_2014_normalized = 'aigle ouest',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6137","canton_name_2014":"Aigle-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6137';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Alençon  3e  Canton',
    canton_name_2014_normalized = 'alencon 3e canton',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6138","canton_name_2014":"Alençon  3e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6138';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Argentan-Ouest',
    canton_name_2014_normalized = 'argentan ouest',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6139","canton_name_2014":"Argentan-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6139';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Flers-Sud',
    canton_name_2014_normalized = 'flers sud',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6140","canton_name_2014":"Flers-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6140';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6196","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6196';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6197","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6197';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6198","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6198';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '61',
    source_payload = '{"canton_code_2014":"6199","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6199';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Arras-Nord',
    canton_name_2014_normalized = 'arras nord',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6203","canton_name_2014":"Arras-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6203';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Arras-Sud',
    canton_name_2014_normalized = 'arras sud',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6204","canton_name_2014":"Arras-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6204';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Auxi-le-Château',
    canton_name_2014_normalized = 'auxi le chateau',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6207","canton_name_2014":"Auxi-le-Château"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6207';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Beaumetz-lès-Loges',
    canton_name_2014_normalized = 'beaumetz les loges',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6210","canton_name_2014":"Beaumetz-lès-Loges"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6210';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Béthune-Nord',
    canton_name_2014_normalized = 'bethune nord',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6212","canton_name_2014":"Béthune-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6212';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Boulogne-sur-Mer-Nord-Est',
    canton_name_2014_normalized = 'boulogne sur mer nord est',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6213","canton_name_2014":"Boulogne-sur-Mer-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6213';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Boulogne-sur-Mer-Sud',
    canton_name_2014_normalized = 'boulogne sur mer sud',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6214","canton_name_2014":"Boulogne-sur-Mer-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6214';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Calais-Nord-Ouest',
    canton_name_2014_normalized = 'calais nord ouest',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6215","canton_name_2014":"Calais-Nord-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6215';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Calais-Centre',
    canton_name_2014_normalized = 'calais centre',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6216","canton_name_2014":"Calais-Centre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6216';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Campagne-lès-Hesdin',
    canton_name_2014_normalized = 'campagne les hesdin',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6218","canton_name_2014":"Campagne-lès-Hesdin"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6218';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Étaples',
    canton_name_2014_normalized = 'etaples',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6222","canton_name_2014":"Étaples"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6222';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Guînes',
    canton_name_2014_normalized = 'guines',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6225","canton_name_2014":"Guînes"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6225';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lens-Est',
    canton_name_2014_normalized = 'lens est',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6231","canton_name_2014":"Lens-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6231';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Liévin-Nord',
    canton_name_2014_normalized = 'lievin nord',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6232","canton_name_2014":"Liévin-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6232';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montreuil',
    canton_name_2014_normalized = 'montreuil',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6237","canton_name_2014":"Montreuil"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6237';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Omer-Nord',
    canton_name_2014_normalized = 'saint omer nord',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6241","canton_name_2014":"Saint-Omer-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6241';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Omer-Sud',
    canton_name_2014_normalized = 'saint omer sud',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6242","canton_name_2014":"Saint-Omer-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6242';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Hénin-Beaumont',
    canton_name_2014_normalized = 'henin beaumont',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6248","canton_name_2014":"Hénin-Beaumont"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6248';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lens-Nord-Est',
    canton_name_2014_normalized = 'lens nord est',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6249","canton_name_2014":"Lens-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6249';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lens-Nord-Ouest',
    canton_name_2014_normalized = 'lens nord ouest',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6250","canton_name_2014":"Lens-Nord-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6250';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Béthune-Sud',
    canton_name_2014_normalized = 'bethune sud',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6253","canton_name_2014":"Béthune-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6253';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Calais-Est',
    canton_name_2014_normalized = 'calais est',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6254","canton_name_2014":"Calais-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6254';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Courrières',
    canton_name_2014_normalized = 'courrieres',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6259","canton_name_2014":"Courrières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6259';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Liévin-Sud',
    canton_name_2014_normalized = 'lievin sud',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6260","canton_name_2014":"Liévin-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6260';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Boulogne-sur-Mer-Nord-Ouest',
    canton_name_2014_normalized = 'boulogne sur mer nord ouest',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6265","canton_name_2014":"Boulogne-sur-Mer-Nord-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6265';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Béthune-Est',
    canton_name_2014_normalized = 'bethune est',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6270","canton_name_2014":"Béthune-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6270';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6288","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6288';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6289","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6289';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6290","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6290';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6291","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6291';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6292","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6292';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6295","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6295';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6296","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6296';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6297","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6297';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6298","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6298';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '62',
    source_payload = '{"canton_code_2014":"6299","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6299';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteldon',
    canton_name_2014_normalized = 'chateldon',
    department_code = '63',
    source_payload = '{"canton_code_2014":"6309","canton_name_2014":"Châteldon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6309';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Courpière',
    canton_name_2014_normalized = 'courpiere',
    department_code = '63',
    source_payload = '{"canton_code_2014":"6315","canton_name_2014":"Courpière"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6315';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Issoire',
    canton_name_2014_normalized = 'issoire',
    department_code = '63',
    source_payload = '{"canton_code_2014":"6319","canton_name_2014":"Issoire"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6319';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pont-du-Château',
    canton_name_2014_normalized = 'pont du chateau',
    department_code = '63',
    source_payload = '{"canton_code_2014":"6330","canton_name_2014":"Pont-du-Château"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6330';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Riom-Est',
    canton_name_2014_normalized = 'riom est',
    department_code = '63',
    source_payload = '{"canton_code_2014":"6333","canton_name_2014":"Riom-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6333';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Riom-Ouest',
    canton_name_2014_normalized = 'riom ouest',
    department_code = '63',
    source_payload = '{"canton_code_2014":"6334","canton_name_2014":"Riom-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6334';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Anthème',
    canton_name_2014_normalized = 'saint antheme',
    department_code = '63',
    source_payload = '{"canton_code_2014":"6338","canton_name_2014":"Saint-Anthème"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6338';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Rémy-sur-Durolle',
    canton_name_2014_normalized = 'saint remy sur durolle',
    department_code = '63',
    source_payload = '{"canton_code_2014":"6343","canton_name_2014":"Saint-Rémy-sur-Durolle"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6343';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Thiers',
    canton_name_2014_normalized = 'thiers',
    department_code = '63',
    source_payload = '{"canton_code_2014":"6346","canton_name_2014":"Thiers"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6346';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Aubière',
    canton_name_2014_normalized = 'aubiere',
    department_code = '63',
    source_payload = '{"canton_code_2014":"6355","canton_name_2014":"Aubière"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6355';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chamalières',
    canton_name_2014_normalized = 'chamalieres',
    department_code = '63',
    source_payload = '{"canton_code_2014":"6357","canton_name_2014":"Chamalières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6357';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '63',
    source_payload = '{"canton_code_2014":"6398","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6398';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '63',
    source_payload = '{"canton_code_2014":"6399","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6399';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Arthez-de-Béarn',
    canton_name_2014_normalized = 'arthez de bearn',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6403","canton_name_2014":"Arthez-de-Béarn"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6403';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bayonne-Nord',
    canton_name_2014_normalized = 'bayonne nord',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6407","canton_name_2014":"Bayonne-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6407';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mauléon-Licharre',
    canton_name_2014_normalized = 'mauleon licharre',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6420","canton_name_2014":"Mauléon-Licharre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6420';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Morlaàs',
    canton_name_2014_normalized = 'morlaas',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6423","canton_name_2014":"Morlaàs"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6423';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Nay-Est',
    canton_name_2014_normalized = 'nay est',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6425","canton_name_2014":"Nay-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6425';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Nay-Ouest',
    canton_name_2014_normalized = 'nay ouest',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6426","canton_name_2014":"Nay-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6426';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Oloron-Sainte-Marie-Est',
    canton_name_2014_normalized = 'oloron sainte marie est',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6427","canton_name_2014":"Oloron-Sainte-Marie-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6427';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Oloron-Sainte-Marie-Ouest',
    canton_name_2014_normalized = 'oloron sainte marie ouest',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6428","canton_name_2014":"Oloron-Sainte-Marie-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6428';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pau-Est',
    canton_name_2014_normalized = 'pau est',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6431","canton_name_2014":"Pau-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6431';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Étienne-de-Baïgorry',
    canton_name_2014_normalized = 'saint etienne de baigorry',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6433","canton_name_2014":"Saint-Étienne-de-Baïgorry"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6433';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Salies-de-Béarn',
    canton_name_2014_normalized = 'salies de bearn',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6437","canton_name_2014":"Salies-de-Béarn"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6437';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sauveterre-de-Béarn',
    canton_name_2014_normalized = 'sauveterre de bearn',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6438","canton_name_2014":"Sauveterre-de-Béarn"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6438';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Thèze',
    canton_name_2014_normalized = 'theze',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6440","canton_name_2014":"Thèze"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6440';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Jurançon',
    canton_name_2014_normalized = 'jurancon',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6446","canton_name_2014":"Jurançon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6446';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pau-Sud',
    canton_name_2014_normalized = 'pau sud',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6447","canton_name_2014":"Pau-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6447';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pau-Ouest',
    canton_name_2014_normalized = 'pau ouest',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6448","canton_name_2014":"Pau-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6448';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Billère',
    canton_name_2014_normalized = 'billere',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6451","canton_name_2014":"Billère"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6451';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6490","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6490';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6491","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6491';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6495","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6495';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6496","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6496';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6497","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6497';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6498","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6498';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '64',
    source_payload = '{"canton_code_2014":"6499","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6499';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Argelès-Gazost',
    canton_name_2014_normalized = 'argeles gazost',
    department_code = '65',
    source_payload = '{"canton_code_2014":"6501","canton_name_2014":"Argelès-Gazost"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6501';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bagnères-de-Bigorre',
    canton_name_2014_normalized = 'bagneres de bigorre',
    department_code = '65',
    source_payload = '{"canton_code_2014":"6504","canton_name_2014":"Bagnères-de-Bigorre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6504';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bordères-Louron',
    canton_name_2014_normalized = 'borderes louron',
    department_code = '65',
    source_payload = '{"canton_code_2014":"6506","canton_name_2014":"Bordères-Louron"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6506';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Castelnau-Rivière-Basse',
    canton_name_2014_normalized = 'castelnau riviere basse',
    department_code = '65',
    source_payload = '{"canton_code_2014":"6509","canton_name_2014":"Castelnau-Rivière-Basse"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6509';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lourdes-Est',
    canton_name_2014_normalized = 'lourdes est',
    department_code = '65',
    source_payload = '{"canton_code_2014":"6512","canton_name_2014":"Lourdes-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6512';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mauléon-Barousse',
    canton_name_2014_normalized = 'mauleon barousse',
    department_code = '65',
    source_payload = '{"canton_code_2014":"6515","canton_name_2014":"Mauléon-Barousse"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6515';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Pé-de-Bigorre',
    canton_name_2014_normalized = 'saint pe de bigorre',
    department_code = '65',
    source_payload = '{"canton_code_2014":"6520","canton_name_2014":"Saint-Pé-de-Bigorre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6520';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Séméac',
    canton_name_2014_normalized = 'semeac',
    department_code = '65',
    source_payload = '{"canton_code_2014":"6522","canton_name_2014":"Séméac"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6522';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Trie-sur-Baïse',
    canton_name_2014_normalized = 'trie sur baise',
    department_code = '65',
    source_payload = '{"canton_code_2014":"6524","canton_name_2014":"Trie-sur-Baïse"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6524';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lourdes-Ouest',
    canton_name_2014_normalized = 'lourdes ouest',
    department_code = '65',
    source_payload = '{"canton_code_2014":"6527","canton_name_2014":"Lourdes-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6527';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bordères-sur-l''Échez',
    canton_name_2014_normalized = 'borderes sur l echez',
    department_code = '65',
    source_payload = '{"canton_code_2014":"6533","canton_name_2014":"Bordères-sur-l''Échez"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6533';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Laloubère',
    canton_name_2014_normalized = 'laloubere',
    department_code = '65',
    source_payload = '{"canton_code_2014":"6534","canton_name_2014":"Laloubère"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6534';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '65',
    source_payload = '{"canton_code_2014":"6598","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6598';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '65',
    source_payload = '{"canton_code_2014":"6599","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6599';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Argelès-sur-Mer',
    canton_name_2014_normalized = 'argeles sur mer',
    department_code = '66',
    source_payload = '{"canton_code_2014":"6601","canton_name_2014":"Argelès-sur-Mer"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6601';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Céret',
    canton_name_2014_normalized = 'ceret',
    department_code = '66',
    source_payload = '{"canton_code_2014":"6603","canton_name_2014":"Céret"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6603';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Prades',
    canton_name_2014_normalized = 'prades',
    department_code = '66',
    source_payload = '{"canton_code_2014":"6610","canton_name_2014":"Prades"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6610';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vinça',
    canton_name_2014_normalized = 'vinca',
    department_code = '66',
    source_payload = '{"canton_code_2014":"6618","canton_name_2014":"Vinça"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6618';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Côte Vermeille',
    canton_name_2014_normalized = 'cote vermeille',
    department_code = '66',
    source_payload = '{"canton_code_2014":"6619","canton_name_2014":"Côte Vermeille"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6619';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Perpignan  3e  Canton',
    canton_name_2014_normalized = 'perpignan 3e canton',
    department_code = '66',
    source_payload = '{"canton_code_2014":"6620","canton_name_2014":"Perpignan  3e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6620';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Perpignan  7e  Canton',
    canton_name_2014_normalized = 'perpignan 7e canton',
    department_code = '66',
    source_payload = '{"canton_code_2014":"6624","canton_name_2014":"Perpignan  7e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6624';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Côte Radieuse',
    canton_name_2014_normalized = 'cote radieuse',
    department_code = '66',
    source_payload = '{"canton_code_2014":"6627","canton_name_2014":"Côte Radieuse"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6627';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Estève',
    canton_name_2014_normalized = 'saint esteve',
    department_code = '66',
    source_payload = '{"canton_code_2014":"6630","canton_name_2014":"Saint-Estève"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6630';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '66',
    source_payload = '{"canton_code_2014":"6699","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6699';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Haguenau',
    canton_name_2014_normalized = 'haguenau',
    department_code = '67',
    source_payload = '{"canton_code_2014":"6709","canton_name_2014":"Haguenau"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6709';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Molsheim',
    canton_name_2014_normalized = 'molsheim',
    department_code = '67',
    source_payload = '{"canton_code_2014":"6714","canton_name_2014":"Molsheim"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6714';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saverne',
    canton_name_2014_normalized = 'saverne',
    department_code = '67',
    source_payload = '{"canton_code_2014":"6721","canton_name_2014":"Saverne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6721';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sélestat',
    canton_name_2014_normalized = 'selestat',
    department_code = '67',
    source_payload = '{"canton_code_2014":"6724","canton_name_2014":"Sélestat"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6724';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Soultz-sous-Forêts',
    canton_name_2014_normalized = 'soultz sous forets',
    department_code = '67',
    source_payload = '{"canton_code_2014":"6726","canton_name_2014":"Soultz-sous-Forêts"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6726';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Villé',
    canton_name_2014_normalized = 'ville',
    department_code = '67',
    source_payload = '{"canton_code_2014":"6732","canton_name_2014":"Villé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6732';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Wissembourg',
    canton_name_2014_normalized = 'wissembourg',
    department_code = '67',
    source_payload = '{"canton_code_2014":"6734","canton_name_2014":"Wissembourg"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6734';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '67',
    source_payload = '{"canton_code_2014":"6799","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6799';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Guebwiller',
    canton_name_2014_normalized = 'guebwiller',
    department_code = '68',
    source_payload = '{"canton_code_2014":"6808","canton_name_2014":"Guebwiller"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6808';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mulhouse-Sud',
    canton_name_2014_normalized = 'mulhouse sud',
    department_code = '68',
    source_payload = '{"canton_code_2014":"6817","canton_name_2014":"Mulhouse-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6817';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ribeauvillé',
    canton_name_2014_normalized = 'ribeauville',
    department_code = '68',
    source_payload = '{"canton_code_2014":"6820","canton_name_2014":"Ribeauvillé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6820';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Thann',
    canton_name_2014_normalized = 'thann',
    department_code = '68',
    source_payload = '{"canton_code_2014":"6825","canton_name_2014":"Thann"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6825';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Colmar-Sud',
    canton_name_2014_normalized = 'colmar sud',
    department_code = '68',
    source_payload = '{"canton_code_2014":"6828","canton_name_2014":"Colmar-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6828';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '68',
    source_payload = '{"canton_code_2014":"6898","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6898';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '68',
    source_payload = '{"canton_code_2014":"6899","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6899';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Neuville-sur-Saône',
    canton_name_2014_normalized = 'neuville sur saone',
    department_code = '69',
    source_payload = '{"canton_code_2014":"6925","canton_name_2014":"Neuville-sur-Saône"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6925';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Villefranche-sur-Saône',
    canton_name_2014_normalized = 'villefranche sur saone',
    department_code = '69',
    source_payload = '{"canton_code_2014":"6932","canton_name_2014":"Villefranche-sur-Saône"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6932';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Décines-Charpieu',
    canton_name_2014_normalized = 'decines charpieu',
    department_code = '69',
    source_payload = '{"canton_code_2014":"6944","canton_name_2014":"Décines-Charpieu"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6944';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sainte-Foy-lès-Lyon',
    canton_name_2014_normalized = 'sainte foy les lyon',
    department_code = '69',
    source_payload = '{"canton_code_2014":"6950","canton_name_2014":"Sainte-Foy-lès-Lyon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6950';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Écully',
    canton_name_2014_normalized = 'ecully',
    department_code = '69',
    source_payload = '{"canton_code_2014":"6952","canton_name_2014":"Écully"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6952';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Gleizé',
    canton_name_2014_normalized = 'gleize',
    department_code = '69',
    source_payload = '{"canton_code_2014":"6953","canton_name_2014":"Gleizé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6953';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '69',
    source_payload = '{"canton_code_2014":"6997","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6997';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '69',
    source_payload = '{"canton_code_2014":"6998","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6998';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '69',
    source_payload = '{"canton_code_2014":"6999","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '6999';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Autrey-lès-Gray',
    canton_name_2014_normalized = 'autrey les gray',
    department_code = '70',
    source_payload = '{"canton_code_2014":"7002","canton_name_2014":"Autrey-lès-Gray"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7002';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fresne-Saint-Mamès',
    canton_name_2014_normalized = 'fresne saint mames',
    department_code = '70',
    source_payload = '{"canton_code_2014":"7008","canton_name_2014":"Fresne-Saint-Mamès"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7008';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Héricourt-Ouest',
    canton_name_2014_normalized = 'hericourt ouest',
    department_code = '70',
    source_payload = '{"canton_code_2014":"7011","canton_name_2014":"Héricourt-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7011';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lure-Sud',
    canton_name_2014_normalized = 'lure sud',
    department_code = '70',
    source_payload = '{"canton_code_2014":"7013","canton_name_2014":"Lure-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7013';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mélisey',
    canton_name_2014_normalized = 'melisey',
    department_code = '70',
    source_payload = '{"canton_code_2014":"7016","canton_name_2014":"Mélisey"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7016';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Port-sur-Saône',
    canton_name_2014_normalized = 'port sur saone',
    department_code = '70',
    source_payload = '{"canton_code_2014":"7020","canton_name_2014":"Port-sur-Saône"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7020';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Scey-sur-Saône-et-Saint-Albin',
    canton_name_2014_normalized = 'scey sur saone et saint albin',
    department_code = '70',
    source_payload = '{"canton_code_2014":"7024","canton_name_2014":"Scey-sur-Saône-et-Saint-Albin"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7024';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vesoul-Est',
    canton_name_2014_normalized = 'vesoul est',
    department_code = '70',
    source_payload = '{"canton_code_2014":"7026","canton_name_2014":"Vesoul-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7026';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vesoul-Ouest',
    canton_name_2014_normalized = 'vesoul ouest',
    department_code = '70',
    source_payload = '{"canton_code_2014":"7029","canton_name_2014":"Vesoul-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7029';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Héricourt-Est',
    canton_name_2014_normalized = 'hericourt est',
    department_code = '70',
    source_payload = '{"canton_code_2014":"7030","canton_name_2014":"Héricourt-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7030';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lure-Nord',
    canton_name_2014_normalized = 'lure nord',
    department_code = '70',
    source_payload = '{"canton_code_2014":"7031","canton_name_2014":"Lure-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7031';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '70',
    source_payload = '{"canton_code_2014":"7093","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7093';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '70',
    source_payload = '{"canton_code_2014":"7094","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7094';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '70',
    source_payload = '{"canton_code_2014":"7095","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7095';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '70',
    source_payload = '{"canton_code_2014":"7096","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7096';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Autun-Nord',
    canton_name_2014_normalized = 'autun nord',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7101","canton_name_2014":"Autun-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7101';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chalon-sur-Saône-Sud',
    canton_name_2014_normalized = 'chalon sur saone sud',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7107","canton_name_2014":"Chalon-sur-Saône-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7107';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Charolles',
    canton_name_2014_normalized = 'charolles',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7109","canton_name_2014":"Charolles"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7109';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Creusot-Est',
    canton_name_2014_normalized = 'creusot est',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7114","canton_name_2014":"Creusot-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7114';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Épinac',
    canton_name_2014_normalized = 'epinac',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7118","canton_name_2014":"Épinac"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7118';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Issy-l''Évêque',
    canton_name_2014_normalized = 'issy l eveque',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7122","canton_name_2014":"Issy-l''Évêque"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7122';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Louhans',
    canton_name_2014_normalized = 'louhans',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7123","canton_name_2014":"Louhans"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7123';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lucenay-l''Évêque',
    canton_name_2014_normalized = 'lucenay l eveque',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7124","canton_name_2014":"Lucenay-l''Évêque"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7124';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mâcon-Nord',
    canton_name_2014_normalized = 'macon nord',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7126","canton_name_2014":"Mâcon-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7126';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mâcon-Sud',
    canton_name_2014_normalized = 'macon sud',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7127","canton_name_2014":"Mâcon-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7127';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Léger-sous-Beuvray',
    canton_name_2014_normalized = 'saint leger sous beuvray',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7144","canton_name_2014":"Saint-Léger-sous-Beuvray"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7144';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Autun-Sud',
    canton_name_2014_normalized = 'autun sud',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7152","canton_name_2014":"Autun-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7152';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chalon-sur-Saône-Nord',
    canton_name_2014_normalized = 'chalon sur saone nord',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7153","canton_name_2014":"Chalon-sur-Saône-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7153';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mâcon-Centre',
    canton_name_2014_normalized = 'macon centre',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7155","canton_name_2014":"Mâcon-Centre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7155';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montceau-les-Mines-Sud',
    canton_name_2014_normalized = 'montceau les mines sud',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7156","canton_name_2014":"Montceau-les-Mines-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7156';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chalon-sur-Saône-Ouest',
    canton_name_2014_normalized = 'chalon sur saone ouest',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7157","canton_name_2014":"Chalon-sur-Saône-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7157';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7195","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7195';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7196","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7196';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7197","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7197';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7198","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7198';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '71',
    source_payload = '{"canton_code_2014":"7199","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7199';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bonnétable',
    canton_name_2014_normalized = 'bonnetable',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7203","canton_name_2014":"Bonnétable"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7203';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Brûlon',
    canton_name_2014_normalized = 'brulon',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7205","canton_name_2014":"Brûlon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7205';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Château-du-Loir',
    canton_name_2014_normalized = 'chateau du loir',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7207","canton_name_2014":"Château-du-Loir"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7207';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Écommoy',
    canton_name_2014_normalized = 'ecommoy',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7209","canton_name_2014":"Écommoy"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7209';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ferté-Bernard',
    canton_name_2014_normalized = 'ferte bernard',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7210","canton_name_2014":"Ferté-Bernard"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7210';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fresnaye-sur-Chédouet',
    canton_name_2014_normalized = 'fresnaye sur chedouet',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7211","canton_name_2014":"Fresnaye-sur-Chédouet"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7211';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Grand-Lucé',
    canton_name_2014_normalized = 'grand luce',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7213","canton_name_2014":"Grand-Lucé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7213';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Flèche',
    canton_name_2014_normalized = 'fleche',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7214","canton_name_2014":"Flèche"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7214';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Loué',
    canton_name_2014_normalized = 'loue',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7215","canton_name_2014":"Loué"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7215';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mamers',
    canton_name_2014_normalized = 'mamers',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7218","canton_name_2014":"Mamers"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7218';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sablé-sur-Sarthe',
    canton_name_2014_normalized = 'sable sur sarthe',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7227","canton_name_2014":"Sablé-sur-Sarthe"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7227';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sillé-le-Guillaume',
    canton_name_2014_normalized = 'sille le guillaume',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7230","canton_name_2014":"Sillé-le-Guillaume"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7230';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Tuffé',
    canton_name_2014_normalized = 'tuffe',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7232","canton_name_2014":"Tuffé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7232';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mans-Nord-Ouest',
    canton_name_2014_normalized = 'mans nord ouest',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7234","canton_name_2014":"Mans-Nord-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7234';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mans-Sud-Est',
    canton_name_2014_normalized = 'mans sud est',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7235","canton_name_2014":"Mans-Sud-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7235';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mans-Sud-Ouest',
    canton_name_2014_normalized = 'mans sud ouest',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7236","canton_name_2014":"Mans-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7236';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mans-Est-Campagne',
    canton_name_2014_normalized = 'mans est campagne',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7237","canton_name_2014":"Mans-Est-Campagne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7237';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mans-Nord-Campagne',
    canton_name_2014_normalized = 'mans nord campagne',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7238","canton_name_2014":"Mans-Nord-Campagne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7238';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '72',
    source_payload = '{"canton_code_2014":"7299","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7299';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Albertville-Nord',
    canton_name_2014_normalized = 'albertville nord',
    department_code = '73',
    source_payload = '{"canton_code_2014":"7305","canton_name_2014":"Albertville-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7305';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chambéry-Nord',
    canton_name_2014_normalized = 'chambery nord',
    department_code = '73',
    source_payload = '{"canton_code_2014":"7309","canton_name_2014":"Chambéry-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7309';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtelard',
    canton_name_2014_normalized = 'chatelard',
    department_code = '73',
    source_payload = '{"canton_code_2014":"7313","canton_name_2014":"Châtelard"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7313';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Échelles',
    canton_name_2014_normalized = 'echelles',
    department_code = '73',
    source_payload = '{"canton_code_2014":"7314","canton_name_2014":"Échelles"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7314';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Grésy-sur-Isère',
    canton_name_2014_normalized = 'gresy sur isere',
    department_code = '73',
    source_payload = '{"canton_code_2014":"7315","canton_name_2014":"Grésy-sur-Isère"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7315';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montmélian',
    canton_name_2014_normalized = 'montmelian',
    department_code = '73',
    source_payload = '{"canton_code_2014":"7318","canton_name_2014":"Montmélian"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7318';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Moûtiers',
    canton_name_2014_normalized = 'moutiers',
    department_code = '73',
    source_payload = '{"canton_code_2014":"7320","canton_name_2014":"Moûtiers"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7320';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Jean-de-Maurienne',
    canton_name_2014_normalized = 'saint jean de maurienne',
    department_code = '73',
    source_payload = '{"canton_code_2014":"7325","canton_name_2014":"Saint-Jean-de-Maurienne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7325';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Albertville-Sud',
    canton_name_2014_normalized = 'albertville sud',
    department_code = '73',
    source_payload = '{"canton_code_2014":"7330","canton_name_2014":"Albertville-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7330';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Aix-les-Bains-Nord-Grésy',
    canton_name_2014_normalized = 'aix les bains nord gresy',
    department_code = '73',
    source_payload = '{"canton_code_2014":"7332","canton_name_2014":"Aix-les-Bains-Nord-Grésy"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7332';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Aix-les-Bains-Sud',
    canton_name_2014_normalized = 'aix les bains sud',
    department_code = '73',
    source_payload = '{"canton_code_2014":"7335","canton_name_2014":"Aix-les-Bains-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7335';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '73',
    source_payload = '{"canton_code_2014":"7397","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7397';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '73',
    source_payload = '{"canton_code_2014":"7398","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7398';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '73',
    source_payload = '{"canton_code_2014":"7399","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7399';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Alby-sur-Chéran',
    canton_name_2014_normalized = 'alby sur cheran',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7402","canton_name_2014":"Alby-sur-Chéran"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7402';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Annemasse-Nord',
    canton_name_2014_normalized = 'annemasse nord',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7405","canton_name_2014":"Annemasse-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7405';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Boëge',
    canton_name_2014_normalized = 'boege',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7407","canton_name_2014":"Boëge"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7407';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bonneville',
    canton_name_2014_normalized = 'bonneville',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7408","canton_name_2014":"Bonneville"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7408';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Évian-les-Bains',
    canton_name_2014_normalized = 'evian les bains',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7413","canton_name_2014":"Évian-les-Bains"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7413';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Reignier-Ésery',
    canton_name_2014_normalized = 'reignier esery',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7416","canton_name_2014":"Reignier-Ésery"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7416';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Julien-en-Genevois',
    canton_name_2014_normalized = 'saint julien en genevois',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7421","canton_name_2014":"Saint-Julien-en-Genevois"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7421';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Samoëns',
    canton_name_2014_normalized = 'samoens',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7423","canton_name_2014":"Samoëns"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7423';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Thônes',
    canton_name_2014_normalized = 'thones',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7426","canton_name_2014":"Thônes"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7426';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Thonon-les-Bains-Est',
    canton_name_2014_normalized = 'thonon les bains est',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7427","canton_name_2014":"Thonon-les-Bains-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7427';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Thorens-Glières',
    canton_name_2014_normalized = 'thorens glieres',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7428","canton_name_2014":"Thorens-Glières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7428';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Annecy-Nord-Ouest',
    canton_name_2014_normalized = 'annecy nord ouest',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7429","canton_name_2014":"Annecy-Nord-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7429';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Annemasse-Sud',
    canton_name_2014_normalized = 'annemasse sud',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7431","canton_name_2014":"Annemasse-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7431';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Thonon-les-Bains-Ouest',
    canton_name_2014_normalized = 'thonon les bains ouest',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7434","canton_name_2014":"Thonon-les-Bains-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7434';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7495","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7495';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7496","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7496';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '74',
    source_payload = '{"canton_code_2014":"7499","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7499';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '75',
    source_payload = '{"canton_code_2014":"7599","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7599';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Clères',
    canton_name_2014_normalized = 'cleres',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7611","canton_name_2014":"Clères"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7611';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Darnétal',
    canton_name_2014_normalized = 'darnetal',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7613","canton_name_2014":"Darnétal"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7613';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dieppe-Est',
    canton_name_2014_normalized = 'dieppe est',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7614","canton_name_2014":"Dieppe-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7614';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fécamp',
    canton_name_2014_normalized = 'fecamp',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7621","canton_name_2014":"Fécamp"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7621';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Londinières',
    canton_name_2014_normalized = 'londinieres',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7634","canton_name_2014":"Londinières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7634';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Neufchâtel-en-Bray',
    canton_name_2014_normalized = 'neufchatel en bray',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7638","canton_name_2014":"Neufchâtel-en-Bray"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7638';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Saëns',
    canton_name_2014_normalized = 'saint saens',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7649","canton_name_2014":"Saint-Saëns"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7649';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Tôtes',
    canton_name_2014_normalized = 'totes',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7652","canton_name_2014":"Tôtes"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7652';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Havre  6e  Canton',
    canton_name_2014_normalized = 'havre 6e canton',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7656","canton_name_2014":"Havre  6e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7656';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Caudebec-lès-Elbeuf',
    canton_name_2014_normalized = 'caudebec les elbeuf',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7661","canton_name_2014":"Caudebec-lès-Elbeuf"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7661';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Étienne-du-Rouvray',
    canton_name_2014_normalized = 'saint etienne du rouvray',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7669","canton_name_2014":"Saint-Étienne-du-Rouvray"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7669';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7692","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7692';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7693","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7693';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7694","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7694';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7695","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7695';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7698","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7698';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '76',
    source_payload = '{"canton_code_2014":"7699","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7699';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Château-Landon',
    canton_name_2014_normalized = 'chateau landon',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7704","canton_name_2014":"Château-Landon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7704';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtelet-en-Brie',
    canton_name_2014_normalized = 'chatelet en brie',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7705","canton_name_2014":"Châtelet-en-Brie"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7705';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Crécy-la-Chapelle',
    canton_name_2014_normalized = 'crecy la chapelle',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7708","canton_name_2014":"Crécy-la-Chapelle"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7708';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dammartin-en-Goële',
    canton_name_2014_normalized = 'dammartin en goele',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7709","canton_name_2014":"Dammartin-en-Goële"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7709';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ferté-Gaucher',
    canton_name_2014_normalized = 'ferte gaucher',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7711","canton_name_2014":"Ferté-Gaucher"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7711';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ferté-sous-Jouarre',
    canton_name_2014_normalized = 'ferte sous jouarre',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7712","canton_name_2014":"Ferté-sous-Jouarre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7712';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fontainebleau',
    canton_name_2014_normalized = 'fontainebleau',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7713","canton_name_2014":"Fontainebleau"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7713';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lorrez-le-Bocage-Préaux',
    canton_name_2014_normalized = 'lorrez le bocage preaux',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7716","canton_name_2014":"Lorrez-le-Bocage-Préaux"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7716';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Meaux-Nord',
    canton_name_2014_normalized = 'meaux nord',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7717","canton_name_2014":"Meaux-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7717';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Melun-Nord',
    canton_name_2014_normalized = 'melun nord',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7718","canton_name_2014":"Melun-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7718';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Melun-Sud',
    canton_name_2014_normalized = 'melun sud',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7719","canton_name_2014":"Melun-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7719';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Provins',
    canton_name_2014_normalized = 'provins',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7725","canton_name_2014":"Provins"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7725';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Meaux-Sud',
    canton_name_2014_normalized = 'meaux sud',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7731","canton_name_2014":"Meaux-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7731';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Torcy',
    canton_name_2014_normalized = 'torcy',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7735","canton_name_2014":"Torcy"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7735';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mée-sur-Seine',
    canton_name_2014_normalized = 'mee sur seine',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7742","canton_name_2014":"Mée-sur-Seine"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7742';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7797","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7797';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7798","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7798';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '77',
    source_payload = '{"canton_code_2014":"7799","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7799';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bonnières-sur-Seine',
    canton_name_2014_normalized = 'bonnieres sur seine',
    department_code = '78',
    source_payload = '{"canton_code_2014":"7802","canton_name_2014":"Bonnières-sur-Seine"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7802';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Poissy-Nord',
    canton_name_2014_normalized = 'poissy nord',
    department_code = '78',
    source_payload = '{"canton_code_2014":"7816","canton_name_2014":"Poissy-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7816';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Poissy-Sud',
    canton_name_2014_normalized = 'poissy sud',
    department_code = '78',
    source_payload = '{"canton_code_2014":"7817","canton_name_2014":"Poissy-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7817';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rambouillet',
    canton_name_2014_normalized = 'rambouillet',
    department_code = '78',
    source_payload = '{"canton_code_2014":"7818","canton_name_2014":"Rambouillet"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7818';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Germain-en-Laye-Nord',
    canton_name_2014_normalized = 'saint germain en laye nord',
    department_code = '78',
    source_payload = '{"canton_code_2014":"7820","canton_name_2014":"Saint-Germain-en-Laye-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7820';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Germain-en-Laye-Sud',
    canton_name_2014_normalized = 'saint germain en laye sud',
    department_code = '78',
    source_payload = '{"canton_code_2014":"7821","canton_name_2014":"Saint-Germain-en-Laye-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7821';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Nom-la-Bretèche',
    canton_name_2014_normalized = 'saint nom la breteche',
    department_code = '78',
    source_payload = '{"canton_code_2014":"7822","canton_name_2014":"Saint-Nom-la-Bretèche"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7822';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Versailles-Sud',
    canton_name_2014_normalized = 'versailles sud',
    department_code = '78',
    source_payload = '{"canton_code_2014":"7829","canton_name_2014":"Versailles-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7829';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vésinet',
    canton_name_2014_normalized = 'vesinet',
    department_code = '78',
    source_payload = '{"canton_code_2014":"7830","canton_name_2014":"Vésinet"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7830';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Cyr-l''École',
    canton_name_2014_normalized = 'saint cyr l ecole',
    department_code = '78',
    source_payload = '{"canton_code_2014":"7836","canton_name_2014":"Saint-Cyr-l''École"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7836';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vélizy-Villacoublay',
    canton_name_2014_normalized = 'velizy villacoublay',
    department_code = '78',
    source_payload = '{"canton_code_2014":"7837","canton_name_2014":"Vélizy-Villacoublay"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7837';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Andrésy',
    canton_name_2014_normalized = 'andresy',
    department_code = '78',
    source_payload = '{"canton_code_2014":"7839","canton_name_2014":"Andrésy"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7839';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '78',
    source_payload = '{"canton_code_2014":"7897","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7897';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '78',
    source_payload = '{"canton_code_2014":"7898","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7898';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '78',
    source_payload = '{"canton_code_2014":"7899","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7899';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Argenton-les-Vallées',
    canton_name_2014_normalized = 'argenton les vallees',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7902","canton_name_2014":"Argenton-les-Vallées"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7902';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bressuire',
    canton_name_2014_normalized = 'bressuire',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7904","canton_name_2014":"Bressuire"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7904';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mauléon',
    canton_name_2014_normalized = 'mauleon',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7909","canton_name_2014":"Mauléon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7909';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mauzé-sur-le-Mignon',
    canton_name_2014_normalized = 'mauze sur le mignon',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7914","canton_name_2014":"Mauzé-sur-le-Mignon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7914';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mazières-en-Gâtine',
    canton_name_2014_normalized = 'mazieres en gatine',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7915","canton_name_2014":"Mazières-en-Gâtine"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7915';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ménigoute',
    canton_name_2014_normalized = 'menigoute',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7917","canton_name_2014":"Ménigoute"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7917';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mothe-Saint-Héray',
    canton_name_2014_normalized = 'mothe saint heray',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7919","canton_name_2014":"Mothe-Saint-Héray"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7919';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Niort-Nord',
    canton_name_2014_normalized = 'niort nord',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7920","canton_name_2014":"Niort-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7920';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Niort-Ouest',
    canton_name_2014_normalized = 'niort ouest',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7921","canton_name_2014":"Niort-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7921';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Parthenay',
    canton_name_2014_normalized = 'parthenay',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7922","canton_name_2014":"Parthenay"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7922';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Loup-Lamairé',
    canton_name_2014_normalized = 'saint loup lamaire',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7924","canton_name_2014":"Saint-Loup-Lamairé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7924';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Maixent-l''École  1er Canton',
    canton_name_2014_normalized = 'saint maixent l ecole 1er canton',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7925","canton_name_2014":"Saint-Maixent-l''École  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7925';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Maixent-l''École  2e  Canton',
    canton_name_2014_normalized = 'saint maixent l ecole 2e canton',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7926","canton_name_2014":"Saint-Maixent-l''École  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7926';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sauzé-Vaussais',
    canton_name_2014_normalized = 'sauze vaussais',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7928","canton_name_2014":"Sauzé-Vaussais"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7928';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Thénezay',
    canton_name_2014_normalized = 'thenezay',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7930","canton_name_2014":"Thénezay"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7930';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Thouars  1er Canton',
    canton_name_2014_normalized = 'thouars 1er canton',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7931","canton_name_2014":"Thouars  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7931';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Thouars  2e  Canton',
    canton_name_2014_normalized = 'thouars 2e canton',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7932","canton_name_2014":"Thouars  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7932';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7995","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7995';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7997","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7997';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7998","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7998';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '79',
    source_payload = '{"canton_code_2014":"7999","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '7999';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Abbeville-Nord',
    canton_name_2014_normalized = 'abbeville nord',
    department_code = '80',
    source_payload = '{"canton_code_2014":"8001","canton_name_2014":"Abbeville-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8001';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Abbeville-Sud',
    canton_name_2014_normalized = 'abbeville sud',
    department_code = '80',
    source_payload = '{"canton_code_2014":"8002","canton_name_2014":"Abbeville-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8002';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Acheux-en-Amiénois',
    canton_name_2014_normalized = 'acheux en amienois',
    department_code = '80',
    source_payload = '{"canton_code_2014":"8003","canton_name_2014":"Acheux-en-Amiénois"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8003';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Amiens  1er (Ouest)',
    canton_name_2014_normalized = 'amiens 1er ouest',
    department_code = '80',
    source_payload = '{"canton_code_2014":"8007","canton_name_2014":"Amiens  1er (Ouest)"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8007';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Amiens  2e  (Nord-Ouest)',
    canton_name_2014_normalized = 'amiens 2e nord ouest',
    department_code = '80',
    source_payload = '{"canton_code_2014":"8008","canton_name_2014":"Amiens  2e  (Nord-Ouest)"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8008';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Amiens  3e  (Nord-Est)',
    canton_name_2014_normalized = 'amiens 3e nord est',
    department_code = '80',
    source_payload = '{"canton_code_2014":"8009","canton_name_2014":"Amiens  3e  (Nord-Est)"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8009';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Amiens  4e  (Est)',
    canton_name_2014_normalized = 'amiens 4e est',
    department_code = '80',
    source_payload = '{"canton_code_2014":"8010","canton_name_2014":"Amiens  4e  (Est)"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8010';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Crécy-en-Ponthieu',
    canton_name_2014_normalized = 'crecy en ponthieu',
    department_code = '80',
    source_payload = '{"canton_code_2014":"8019","canton_name_2014":"Crécy-en-Ponthieu"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8019';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montdidier',
    canton_name_2014_normalized = 'montdidier',
    department_code = '80',
    source_payload = '{"canton_code_2014":"8027","canton_name_2014":"Montdidier"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8027';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Péronne',
    canton_name_2014_normalized = 'peronne',
    department_code = '80',
    source_payload = '{"canton_code_2014":"8033","canton_name_2014":"Péronne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8033';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rosières-en-Santerre',
    canton_name_2014_normalized = 'rosieres en santerre',
    department_code = '80',
    source_payload = '{"canton_code_2014":"8037","canton_name_2014":"Rosières-en-Santerre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8037';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Amiens  5e  (Sud-Est)',
    canton_name_2014_normalized = 'amiens 5e sud est',
    department_code = '80',
    source_payload = '{"canton_code_2014":"8042","canton_name_2014":"Amiens  5e  (Sud-Est)"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8042';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Amiens  7e  (Sud-Ouest)',
    canton_name_2014_normalized = 'amiens 7e sud ouest',
    department_code = '80',
    source_payload = '{"canton_code_2014":"8044","canton_name_2014":"Amiens  7e  (Sud-Ouest)"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8044';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Amiens  8e  (Nord)',
    canton_name_2014_normalized = 'amiens 8e nord',
    department_code = '80',
    source_payload = '{"canton_code_2014":"8045","canton_name_2014":"Amiens  8e  (Nord)"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8045';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '80',
    source_payload = '{"canton_code_2014":"8098","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8098';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '80',
    source_payload = '{"canton_code_2014":"8099","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8099';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Anglès',
    canton_name_2014_normalized = 'angles',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8103","canton_name_2014":"Anglès"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8103';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Carmaux-Nord',
    canton_name_2014_normalized = 'carmaux nord',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8106","canton_name_2014":"Carmaux-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8106';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Labruguière',
    canton_name_2014_normalized = 'labruguiere',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8114","canton_name_2014":"Labruguière"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8114';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mazamet-Nord-Est',
    canton_name_2014_normalized = 'mazamet nord est',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8119","canton_name_2014":"Mazamet-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8119';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Monestiés',
    canton_name_2014_normalized = 'monesties',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8120","canton_name_2014":"Monestiés"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8120';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montredon-Labessonnié',
    canton_name_2014_normalized = 'montredon labessonnie',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8121","canton_name_2014":"Montredon-Labessonnié"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8121';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Murat-sur-Vèbre',
    canton_name_2014_normalized = 'murat sur vebre',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8122","canton_name_2014":"Murat-sur-Vèbre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8122';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Réalmont',
    canton_name_2014_normalized = 'realmont',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8126","canton_name_2014":"Réalmont"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8126';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Valderiès',
    canton_name_2014_normalized = 'valderies',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8132","canton_name_2014":"Valderiès"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8132';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Albi-Nord-Ouest',
    canton_name_2014_normalized = 'albi nord ouest',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8137","canton_name_2014":"Albi-Nord-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8137';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Albi-Sud',
    canton_name_2014_normalized = 'albi sud',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8138","canton_name_2014":"Albi-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8138';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Carmaux-Sud',
    canton_name_2014_normalized = 'carmaux sud',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8139","canton_name_2014":"Carmaux-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8139';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Castres-Nord',
    canton_name_2014_normalized = 'castres nord',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8140","canton_name_2014":"Castres-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8140';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mazamet-Sud-Ouest',
    canton_name_2014_normalized = 'mazamet sud ouest',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8142","canton_name_2014":"Mazamet-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8142';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Albi-Nord-Est',
    canton_name_2014_normalized = 'albi nord est',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8143","canton_name_2014":"Albi-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8143';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Albi-Est',
    canton_name_2014_normalized = 'albi est',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8144","canton_name_2014":"Albi-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8144';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Albi-Ouest',
    canton_name_2014_normalized = 'albi ouest',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8145","canton_name_2014":"Albi-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8145';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Castres-Ouest',
    canton_name_2014_normalized = 'castres ouest',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8146","canton_name_2014":"Castres-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8146';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8196","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8196';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8197","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8197';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8198","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8198';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '81',
    source_payload = '{"canton_code_2014":"8199","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8199';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lafrançaise',
    canton_name_2014_normalized = 'lafrancaise',
    department_code = '82',
    source_payload = '{"canton_code_2014":"8208","canton_name_2014":"Lafrançaise"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8208';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Moissac  1er Canton',
    canton_name_2014_normalized = 'moissac 1er canton',
    department_code = '82',
    source_payload = '{"canton_code_2014":"8211","canton_name_2014":"Moissac  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8211';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Molières',
    canton_name_2014_normalized = 'molieres',
    department_code = '82',
    source_payload = '{"canton_code_2014":"8212","canton_name_2014":"Molières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8212';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montauban  1er Canton',
    canton_name_2014_normalized = 'montauban 1er canton',
    department_code = '82',
    source_payload = '{"canton_code_2014":"8215","canton_name_2014":"Montauban  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8215';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Nègrepelisse',
    canton_name_2014_normalized = 'negrepelisse',
    department_code = '82',
    source_payload = '{"canton_code_2014":"8219","canton_name_2014":"Nègrepelisse"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8219';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Castelsarrasin  2e  Canton',
    canton_name_2014_normalized = 'castelsarrasin 2e canton',
    department_code = '82',
    source_payload = '{"canton_code_2014":"8225","canton_name_2014":"Castelsarrasin  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8225';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Moissac  2e  Canton',
    canton_name_2014_normalized = 'moissac 2e canton',
    department_code = '82',
    source_payload = '{"canton_code_2014":"8226","canton_name_2014":"Moissac  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8226';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montauban  3e  Canton',
    canton_name_2014_normalized = 'montauban 3e canton',
    department_code = '82',
    source_payload = '{"canton_code_2014":"8227","canton_name_2014":"Montauban  3e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8227';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '82',
    source_payload = '{"canton_code_2014":"8297","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8297';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '82',
    source_payload = '{"canton_code_2014":"8298","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8298';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '82',
    source_payload = '{"canton_code_2014":"8299","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8299';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Collobrières',
    canton_name_2014_normalized = 'collobrieres',
    department_code = '83',
    source_payload = '{"canton_code_2014":"8307","canton_name_2014":"Collobrières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8307';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Draguignan',
    canton_name_2014_normalized = 'draguignan',
    department_code = '83',
    source_payload = '{"canton_code_2014":"8311","canton_name_2014":"Draguignan"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8311';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fréjus',
    canton_name_2014_normalized = 'frejus',
    department_code = '83',
    source_payload = '{"canton_code_2014":"8313","canton_name_2014":"Fréjus"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8313';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Solliès-Pont',
    canton_name_2014_normalized = 'sollies pont',
    department_code = '83',
    source_payload = '{"canton_code_2014":"8325","canton_name_2014":"Solliès-Pont"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8325';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Raphaël',
    canton_name_2014_normalized = 'saint raphael',
    department_code = '83',
    source_payload = '{"canton_code_2014":"8339","canton_name_2014":"Saint-Raphaël"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8339';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '83',
    source_payload = '{"canton_code_2014":"8397","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8397';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '83',
    source_payload = '{"canton_code_2014":"8398","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8398';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '83',
    source_payload = '{"canton_code_2014":"8399","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8399';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Avignon-Nord',
    canton_name_2014_normalized = 'avignon nord',
    department_code = '84',
    source_payload = '{"canton_code_2014":"8402","canton_name_2014":"Avignon-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8402';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bédarrides',
    canton_name_2014_normalized = 'bedarrides',
    department_code = '84',
    source_payload = '{"canton_code_2014":"8405","canton_name_2014":"Bédarrides"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8405';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bollène',
    canton_name_2014_normalized = 'bollene',
    department_code = '84',
    source_payload = '{"canton_code_2014":"8406","canton_name_2014":"Bollène"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8406';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Carpentras-Nord',
    canton_name_2014_normalized = 'carpentras nord',
    department_code = '84',
    source_payload = '{"canton_code_2014":"8409","canton_name_2014":"Carpentras-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8409';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Carpentras-Sud',
    canton_name_2014_normalized = 'carpentras sud',
    department_code = '84',
    source_payload = '{"canton_code_2014":"8410","canton_name_2014":"Carpentras-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8410';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Malaucène',
    canton_name_2014_normalized = 'malaucene',
    department_code = '84',
    source_payload = '{"canton_code_2014":"8414","canton_name_2014":"Malaucène"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8414';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Orange-Est',
    canton_name_2014_normalized = 'orange est',
    department_code = '84',
    source_payload = '{"canton_code_2014":"8416","canton_name_2014":"Orange-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8416';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Orange-Ouest',
    canton_name_2014_normalized = 'orange ouest',
    department_code = '84',
    source_payload = '{"canton_code_2014":"8417","canton_name_2014":"Orange-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8417';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Valréas',
    canton_name_2014_normalized = 'valreas',
    department_code = '84',
    source_payload = '{"canton_code_2014":"8422","canton_name_2014":"Valréas"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8422';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Avignon-Est',
    canton_name_2014_normalized = 'avignon est',
    department_code = '84',
    source_payload = '{"canton_code_2014":"8423","canton_name_2014":"Avignon-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8423';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '84',
    source_payload = '{"canton_code_2014":"8497","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8497';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '84',
    source_payload = '{"canton_code_2014":"8498","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8498';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '84',
    source_payload = '{"canton_code_2014":"8499","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8499';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chaillé-les-Marais',
    canton_name_2014_normalized = 'chaille les marais',
    department_code = '85',
    source_payload = '{"canton_code_2014":"8502","canton_name_2014":"Chaillé-les-Marais"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8502';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtaigneraie',
    canton_name_2014_normalized = 'chataigneraie',
    department_code = '85',
    source_payload = '{"canton_code_2014":"8505","canton_name_2014":"Châtaigneraie"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8505';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fontenay-le-Comte',
    canton_name_2014_normalized = 'fontenay le comte',
    department_code = '85',
    source_payload = '{"canton_code_2014":"8507","canton_name_2014":"Fontenay-le-Comte"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8507';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Île-d''Yeu',
    canton_name_2014_normalized = 'ile d yeu',
    department_code = '85',
    source_payload = '{"canton_code_2014":"8510","canton_name_2014":"Île-d''Yeu"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8510';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Luçon',
    canton_name_2014_normalized = 'lucon',
    department_code = '85',
    source_payload = '{"canton_code_2014":"8511","canton_name_2014":"Luçon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8511';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mortagne-sur-Sèvre',
    canton_name_2014_normalized = 'mortagne sur sevre',
    department_code = '85',
    source_payload = '{"canton_code_2014":"8515","canton_name_2014":"Mortagne-sur-Sèvre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8515';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Noirmoutier-en-l''Île',
    canton_name_2014_normalized = 'noirmoutier en l ile',
    department_code = '85',
    source_payload = '{"canton_code_2014":"8518","canton_name_2014":"Noirmoutier-en-l''Île"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8518';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Poiré-sur-Vie',
    canton_name_2014_normalized = 'poire sur vie',
    department_code = '85',
    source_payload = '{"canton_code_2014":"8520","canton_name_2014":"Poiré-sur-Vie"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8520';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rocheservière',
    canton_name_2014_normalized = 'rocheserviere',
    department_code = '85',
    source_payload = '{"canton_code_2014":"8522","canton_name_2014":"Rocheservière"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8522';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Roche-sur-Yon-Nord',
    canton_name_2014_normalized = 'roche sur yon nord',
    department_code = '85',
    source_payload = '{"canton_code_2014":"8523","canton_name_2014":"Roche-sur-Yon-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8523';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sables-d''Olonne',
    canton_name_2014_normalized = 'sables d olonne',
    department_code = '85',
    source_payload = '{"canton_code_2014":"8524","canton_name_2014":"Sables-d''Olonne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8524';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Roche-sur-Yon-Sud',
    canton_name_2014_normalized = 'roche sur yon sud',
    department_code = '85',
    source_payload = '{"canton_code_2014":"8531","canton_name_2014":"Roche-sur-Yon-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8531';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '85',
    source_payload = '{"canton_code_2014":"8598","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8598';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtellerault-Nord',
    canton_name_2014_normalized = 'chatellerault nord',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8603","canton_name_2014":"Châtellerault-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8603';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Couhé',
    canton_name_2014_normalized = 'couhe',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8606","canton_name_2014":"Couhé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8606';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dangé-Saint-Romain',
    canton_name_2014_normalized = 'dange saint romain',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8607","canton_name_2014":"Dangé-Saint-Romain"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8607';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Gençay',
    canton_name_2014_normalized = 'gencay',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8608","canton_name_2014":"Gençay"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8608';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lencloître',
    canton_name_2014_normalized = 'lencloitre',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8611","canton_name_2014":"Lencloître"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8611';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lussac-les-Châteaux',
    canton_name_2014_normalized = 'lussac les chateaux',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8614","canton_name_2014":"Lussac-les-Châteaux"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8614';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montmorillon',
    canton_name_2014_normalized = 'montmorillon',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8617","canton_name_2014":"Montmorillon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8617';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Poitiers  1er Canton',
    canton_name_2014_normalized = 'poitiers 1er canton',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8621","canton_name_2014":"Poitiers  1er Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8621';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Poitiers  2e  Canton',
    canton_name_2014_normalized = 'poitiers 2e canton',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8622","canton_name_2014":"Poitiers  2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8622';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Georges-lès-Baillargeaux',
    canton_name_2014_normalized = 'saint georges les baillargeaux',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8623","canton_name_2014":"Saint-Georges-lès-Baillargeaux"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8623';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vouillé',
    canton_name_2014_normalized = 'vouille',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8630","canton_name_2014":"Vouillé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8630';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtellerault-Sud',
    canton_name_2014_normalized = 'chatellerault sud',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8632","canton_name_2014":"Châtellerault-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8632';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Poitiers  3e  Canton',
    canton_name_2014_normalized = 'poitiers 3e canton',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8633","canton_name_2014":"Poitiers  3e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8633';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Poitiers  4e  Canton',
    canton_name_2014_normalized = 'poitiers 4e canton',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8634","canton_name_2014":"Poitiers  4e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8634';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Poitiers  5e  Canton',
    canton_name_2014_normalized = 'poitiers 5e canton',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8635","canton_name_2014":"Poitiers  5e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8635';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Poitiers  6e  Canton',
    canton_name_2014_normalized = 'poitiers 6e canton',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8636","canton_name_2014":"Poitiers  6e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8636';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Poitiers  7e  Canton',
    canton_name_2014_normalized = 'poitiers 7e canton',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8637","canton_name_2014":"Poitiers  7e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8637';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtellerault-Ouest',
    canton_name_2014_normalized = 'chatellerault ouest',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8638","canton_name_2014":"Châtellerault-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8638';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8697","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8697';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '86',
    source_payload = '{"canton_code_2014":"8699","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8699';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châlus',
    canton_name_2014_normalized = 'chalus',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8705","canton_name_2014":"Châlus"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8705';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteauneuf-la-Forêt',
    canton_name_2014_normalized = 'chateauneuf la foret',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8706","canton_name_2014":"Châteauneuf-la-Forêt"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8706';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châteauponsac',
    canton_name_2014_normalized = 'chateauponsac',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8707","canton_name_2014":"Châteauponsac"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8707';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Laurière',
    canton_name_2014_normalized = 'lauriere',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8710","canton_name_2014":"Laurière"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8710';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mézières-sur-Issoire',
    canton_name_2014_normalized = 'mezieres sur issoire',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8716","canton_name_2014":"Mézières-sur-Issoire"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8716';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pierre-Buffière',
    canton_name_2014_normalized = 'pierre buffiere',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8721","canton_name_2014":"Pierre-Buffière"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8721';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rochechouart',
    canton_name_2014_normalized = 'rochechouart',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8722","canton_name_2014":"Rochechouart"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8722';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Junien-Est',
    canton_name_2014_normalized = 'saint junien est',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8724","canton_name_2014":"Saint-Junien-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8724';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Léonard-de-Noblat',
    canton_name_2014_normalized = 'saint leonard de noblat',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8726","canton_name_2014":"Saint-Léonard-de-Noblat"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8726';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Limoges-Isle',
    canton_name_2014_normalized = 'limoges isle',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8731","canton_name_2014":"Limoges-Isle"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8731';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Limoges-Couzeix',
    canton_name_2014_normalized = 'limoges couzeix',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8733","canton_name_2014":"Limoges-Couzeix"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8733';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Limoges-Le Palais',
    canton_name_2014_normalized = 'limoges le palais',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8735","canton_name_2014":"Limoges-Le Palais"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8735';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Limoges-Condat',
    canton_name_2014_normalized = 'limoges condat',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8736","canton_name_2014":"Limoges-Condat"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8736';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Limoges-Panazol',
    canton_name_2014_normalized = 'limoges panazol',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8737","canton_name_2014":"Limoges-Panazol"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8737';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Junien-Ouest',
    canton_name_2014_normalized = 'saint junien ouest',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8738","canton_name_2014":"Saint-Junien-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8738';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8798","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8798';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '87',
    source_payload = '{"canton_code_2014":"8799","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8799';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bruyères',
    canton_name_2014_normalized = 'bruyeres',
    department_code = '88',
    source_payload = '{"canton_code_2014":"8803","canton_name_2014":"Bruyères"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8803';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bulgnéville',
    canton_name_2014_normalized = 'bulgneville',
    department_code = '88',
    source_payload = '{"canton_code_2014":"8804","canton_name_2014":"Bulgnéville"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8804';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtel-sur-Moselle',
    canton_name_2014_normalized = 'chatel sur moselle',
    department_code = '88',
    source_payload = '{"canton_code_2014":"8806","canton_name_2014":"Châtel-sur-Moselle"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8806';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtenois',
    canton_name_2014_normalized = 'chatenois',
    department_code = '88',
    source_payload = '{"canton_code_2014":"8807","canton_name_2014":"Châtenois"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8807';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Épinal-Est',
    canton_name_2014_normalized = 'epinal est',
    department_code = '88',
    source_payload = '{"canton_code_2014":"8812","canton_name_2014":"Épinal-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8812';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Gérardmer',
    canton_name_2014_normalized = 'gerardmer',
    department_code = '88',
    source_payload = '{"canton_code_2014":"8814","canton_name_2014":"Gérardmer"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8814';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Monthureux-sur-Saône',
    canton_name_2014_normalized = 'monthureux sur saone',
    department_code = '88',
    source_payload = '{"canton_code_2014":"8817","canton_name_2014":"Monthureux-sur-Saône"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8817';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Neufchâteau',
    canton_name_2014_normalized = 'neufchateau',
    department_code = '88',
    source_payload = '{"canton_code_2014":"8818","canton_name_2014":"Neufchâteau"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8818';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Plombières-les-Bains',
    canton_name_2014_normalized = 'plombieres les bains',
    department_code = '88',
    source_payload = '{"canton_code_2014":"8819","canton_name_2014":"Plombières-les-Bains"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8819';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Provenchères-sur-Fave',
    canton_name_2014_normalized = 'provencheres sur fave',
    department_code = '88',
    source_payload = '{"canton_code_2014":"8820","canton_name_2014":"Provenchères-sur-Fave"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8820';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Raon-l''Étape',
    canton_name_2014_normalized = 'raon l etape',
    department_code = '88',
    source_payload = '{"canton_code_2014":"8822","canton_name_2014":"Raon-l''Étape"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8822';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Dié-des-Vosges-Est',
    canton_name_2014_normalized = 'saint die des vosges est',
    department_code = '88',
    source_payload = '{"canton_code_2014":"8824","canton_name_2014":"Saint-Dié-des-Vosges-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8824';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Épinal-Ouest',
    canton_name_2014_normalized = 'epinal ouest',
    department_code = '88',
    source_payload = '{"canton_code_2014":"8830","canton_name_2014":"Épinal-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8830';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Dié-des-Vosges-Ouest',
    canton_name_2014_normalized = 'saint die des vosges ouest',
    department_code = '88',
    source_payload = '{"canton_code_2014":"8831","canton_name_2014":"Saint-Dié-des-Vosges-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8831';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '88',
    source_payload = '{"canton_code_2014":"8898","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8898';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '88',
    source_payload = '{"canton_code_2014":"8899","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8899';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Auxerre-Est',
    canton_name_2014_normalized = 'auxerre est',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8903","canton_name_2014":"Auxerre-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8903';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Avallon',
    canton_name_2014_normalized = 'avallon',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8905","canton_name_2014":"Avallon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8905';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bléneau',
    canton_name_2014_normalized = 'bleneau',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8906","canton_name_2014":"Bléneau"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8906';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Brienon-sur-Armançon',
    canton_name_2014_normalized = 'brienon sur armancon',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8907","canton_name_2014":"Brienon-sur-Armançon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8907';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chéroy',
    canton_name_2014_normalized = 'cheroy',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8911","canton_name_2014":"Chéroy"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8911';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Courson-les-Carrières',
    canton_name_2014_normalized = 'courson les carrieres',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8914","canton_name_2014":"Courson-les-Carrières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8914';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cruzy-le-Châtel',
    canton_name_2014_normalized = 'cruzy le chatel',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8915","canton_name_2014":"Cruzy-le-Châtel"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8915';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ligny-le-Châtel',
    canton_name_2014_normalized = 'ligny le chatel',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8920","canton_name_2014":"Ligny-le-Châtel"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8920';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Quarré-les-Tombes',
    canton_name_2014_normalized = 'quarre les tombes',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8923","canton_name_2014":"Quarré-les-Tombes"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8923';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sens-Nord-Est',
    canton_name_2014_normalized = 'sens nord est',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8929","canton_name_2014":"Sens-Nord-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8929';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sens-Ouest',
    canton_name_2014_normalized = 'sens ouest',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8930","canton_name_2014":"Sens-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8930';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vézelay',
    canton_name_2014_normalized = 'vezelay',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8935","canton_name_2014":"Vézelay"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8935';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Villeneuve-l''Archevêque',
    canton_name_2014_normalized = 'villeneuve l archeveque',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8936","canton_name_2014":"Villeneuve-l''Archevêque"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8936';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Auxerre-Sud-Ouest',
    canton_name_2014_normalized = 'auxerre sud ouest',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8938","canton_name_2014":"Auxerre-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8938';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sens-Sud-Est',
    canton_name_2014_normalized = 'sens sud est',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8940","canton_name_2014":"Sens-Sud-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8940';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Auxerre-Nord',
    canton_name_2014_normalized = 'auxerre nord',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8941","canton_name_2014":"Auxerre-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8941';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Auxerre-Sud',
    canton_name_2014_normalized = 'auxerre sud',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8942","canton_name_2014":"Auxerre-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8942';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8995","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8995';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8998","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8998';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '89',
    source_payload = '{"canton_code_2014":"8999","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '8999';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rougemont-le-Château',
    canton_name_2014_normalized = 'rougemont le chateau',
    department_code = '90',
    source_payload = '{"canton_code_2014":"9005","canton_name_2014":"Rougemont-le-Château"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9005';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtenois-les-Forges',
    canton_name_2014_normalized = 'chatenois les forges',
    department_code = '90',
    source_payload = '{"canton_code_2014":"9010","canton_name_2014":"Châtenois-les-Forges"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9010';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '90',
    source_payload = '{"canton_code_2014":"9099","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9099';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bièvres',
    canton_name_2014_normalized = 'bievres',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9103","canton_name_2014":"Bièvres"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9103';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Brétigny-sur-Orge',
    canton_name_2014_normalized = 'bretigny sur orge',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9104","canton_name_2014":"Brétigny-sur-Orge"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9104';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Corbeil-Essonnes-Ouest',
    canton_name_2014_normalized = 'corbeil essonnes ouest',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9106","canton_name_2014":"Corbeil-Essonnes-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9106';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Étampes',
    canton_name_2014_normalized = 'etampes',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9108","canton_name_2014":"Étampes"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9108';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Étréchy',
    canton_name_2014_normalized = 'etrechy',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9109","canton_name_2014":"Étréchy"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9109';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Évry-Sud',
    canton_name_2014_normalized = 'evry sud',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9110","canton_name_2014":"Évry-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9110';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ferté-Alais',
    canton_name_2014_normalized = 'ferte alais',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9111","canton_name_2014":"Ferté-Alais"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9111';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Méréville',
    canton_name_2014_normalized = 'mereville',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9117","canton_name_2014":"Méréville"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9117';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Milly-la-Forêt',
    canton_name_2014_normalized = 'milly la foret',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9118","canton_name_2014":"Milly-la-Forêt"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9118';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montlhéry',
    canton_name_2014_normalized = 'montlhery',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9120","canton_name_2014":"Montlhéry"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9120';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Palaiseau',
    canton_name_2014_normalized = 'palaiseau',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9122","canton_name_2014":"Palaiseau"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9122';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Chéron',
    canton_name_2014_normalized = 'saint cheron',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9124","canton_name_2014":"Saint-Chéron"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9124';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sainte-Geneviève-des-Bois',
    canton_name_2014_normalized = 'sainte genevieve des bois',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9125","canton_name_2014":"Sainte-Geneviève-des-Bois"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9125';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Viry-Châtillon',
    canton_name_2014_normalized = 'viry chatillon',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9127","canton_name_2014":"Viry-Châtillon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9127';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Germain-lès-Corbeil',
    canton_name_2014_normalized = 'saint germain les corbeil',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9132","canton_name_2014":"Saint-Germain-lès-Corbeil"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9132';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Épinay-sous-Sénart',
    canton_name_2014_normalized = 'epinay sous senart',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9138","canton_name_2014":"Épinay-sous-Sénart"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9138';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Évry-Nord',
    canton_name_2014_normalized = 'evry nord',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9139","canton_name_2014":"Évry-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9139';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9196","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9196';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9197","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9197';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9198","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9198';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '91',
    source_payload = '{"canton_code_2014":"9199","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9199';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtillon',
    canton_name_2014_normalized = 'chatillon',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9210","canton_name_2014":"Châtillon"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9210';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sèvres',
    canton_name_2014_normalized = 'sevres',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9237","canton_name_2014":"Sèvres"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9237';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9285","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9285';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9286","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9286';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9287","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9287';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9288","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9288';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9289","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9289';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9290","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9290';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9291","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9291';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9292","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9292';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9293","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9293';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9294","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9294';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9295","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9295';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9296","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9296';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9297","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9297';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9298","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9298';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '92',
    source_payload = '{"canton_code_2014":"9299","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9299';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Épinay-sur-Seine',
    canton_name_2014_normalized = 'epinay sur seine',
    department_code = '93',
    source_payload = '{"canton_code_2014":"9312","canton_name_2014":"Épinay-sur-Seine"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9312';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Raincy',
    canton_name_2014_normalized = 'raincy',
    department_code = '93',
    source_payload = '{"canton_code_2014":"9324","canton_name_2014":"Raincy"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9324';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Denis-Sud',
    canton_name_2014_normalized = 'saint denis sud',
    department_code = '93',
    source_payload = '{"canton_code_2014":"9329","canton_name_2014":"Saint-Denis-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9329';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '93',
    source_payload = '{"canton_code_2014":"9392","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9392';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '93',
    source_payload = '{"canton_code_2014":"9393","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9393';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '93',
    source_payload = '{"canton_code_2014":"9394","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9394';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '93',
    source_payload = '{"canton_code_2014":"9395","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9395';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '93',
    source_payload = '{"canton_code_2014":"9396","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9396';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '93',
    source_payload = '{"canton_code_2014":"9397","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9397';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '93',
    source_payload = '{"canton_code_2014":"9398","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9398';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '93',
    source_payload = '{"canton_code_2014":"9399","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9399';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Boissy-Saint-Léger',
    canton_name_2014_normalized = 'boissy saint leger',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9402","canton_name_2014":"Boissy-Saint-Léger"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9402';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chennevières-sur-Marne',
    canton_name_2014_normalized = 'chennevieres sur marne',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9408","canton_name_2014":"Chennevières-sur-Marne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9408';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Haÿ-les-Roses',
    canton_name_2014_normalized = 'hay les roses',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9412","canton_name_2014":"Haÿ-les-Roses"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9412';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Kremlin-Bicêtre',
    canton_name_2014_normalized = 'kremlin bicetre',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9416","canton_name_2014":"Kremlin-Bicêtre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9416';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Mandé',
    canton_name_2014_normalized = 'saint mande',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9422","canton_name_2014":"Saint-Mandé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9422';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9486","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9486';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9487","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9487';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9488","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9488';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9490","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9490';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9491","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9491';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9493","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9493';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9494","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9494';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9495","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9495';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9496","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9496';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9497","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9497';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9498","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9498';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '94',
    source_payload = '{"canton_code_2014":"9499","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9499';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Écouen',
    canton_name_2014_normalized = 'ecouen',
    department_code = '95',
    source_payload = '{"canton_code_2014":"9508","canton_name_2014":"Écouen"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9508';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Leu-la-Forêt',
    canton_name_2014_normalized = 'saint leu la foret',
    department_code = '95',
    source_payload = '{"canton_code_2014":"9520","canton_name_2014":"Saint-Leu-la-Forêt"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9520';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Ouen-l''Aumône',
    canton_name_2014_normalized = 'saint ouen l aumone',
    department_code = '95',
    source_payload = '{"canton_code_2014":"9521","canton_name_2014":"Saint-Ouen-l''Aumône"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9521';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cergy-Nord',
    canton_name_2014_normalized = 'cergy nord',
    department_code = '95',
    source_payload = '{"canton_code_2014":"9529","canton_name_2014":"Cergy-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9529';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vallée-du-Sausseron',
    canton_name_2014_normalized = 'vallee du sausseron',
    department_code = '95',
    source_payload = '{"canton_code_2014":"9534","canton_name_2014":"Vallée-du-Sausseron"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9534';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cergy-Sud',
    canton_name_2014_normalized = 'cergy sud',
    department_code = '95',
    source_payload = '{"canton_code_2014":"9537","canton_name_2014":"Cergy-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9537';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Garges-lès-Gonesse-Est',
    canton_name_2014_normalized = 'garges les gonesse est',
    department_code = '95',
    source_payload = '{"canton_code_2014":"9538","canton_name_2014":"Garges-lès-Gonesse-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9538';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Hautil',
    canton_name_2014_normalized = 'hautil',
    department_code = '95',
    source_payload = '{"canton_code_2014":"9539","canton_name_2014":"Hautil"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9539';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '95',
    source_payload = '{"canton_code_2014":"9596","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9596';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '95',
    source_payload = '{"canton_code_2014":"9597","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9597';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '95',
    source_payload = '{"canton_code_2014":"9598","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9598';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '95',
    source_payload = '{"canton_code_2014":"9599","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '9599';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Désirade',
    canton_name_2014_normalized = 'desirade',
    department_code = '971',
    source_payload = '{"canton_code_2014":"97110","canton_name_2014":"Désirade"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97110';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-François',
    canton_name_2014_normalized = 'saint francois',
    department_code = '971',
    source_payload = '{"canton_code_2014":"97127","canton_name_2014":"Saint-François"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97127';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sainte-Rose 2e  Canton',
    canton_name_2014_normalized = 'sainte rose 2e canton',
    department_code = '971',
    source_payload = '{"canton_code_2014":"97133","canton_name_2014":"Sainte-Rose 2e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97133';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saintes',
    canton_name_2014_normalized = 'saintes',
    department_code = '971',
    source_payload = '{"canton_code_2014":"97134","canton_name_2014":"Saintes"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97134';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Trois-Rivières',
    canton_name_2014_normalized = 'trois rivieres',
    department_code = '971',
    source_payload = '{"canton_code_2014":"97135","canton_name_2014":"Trois-Rivières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97135';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '971',
    source_payload = '{"canton_code_2014":"97190","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97190';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '971',
    source_payload = '{"canton_code_2014":"97191","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97191';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '971',
    source_payload = '{"canton_code_2014":"97192","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97192';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '971',
    source_payload = '{"canton_code_2014":"97193","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97193';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '971',
    source_payload = '{"canton_code_2014":"97194","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97194';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '971',
    source_payload = '{"canton_code_2014":"97195","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97195';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '971',
    source_payload = '{"canton_code_2014":"97196","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97196';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '971',
    source_payload = '{"canton_code_2014":"97197","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97197';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '971',
    source_payload = '{"canton_code_2014":"97198","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97198';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '971',
    source_payload = '{"canton_code_2014":"97199","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97199';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Case-Pilote-Bellefontaine',
    canton_name_2014_normalized = 'case pilote bellefontaine',
    department_code = '972',
    source_payload = '{"canton_code_2014":"97205","canton_name_2014":"Case-Pilote-Bellefontaine"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97205';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Prêcheur',
    canton_name_2014_normalized = 'precheur',
    department_code = '972',
    source_payload = '{"canton_code_2014":"97223","canton_name_2014":"Prêcheur"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97223';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rivière-Pilote',
    canton_name_2014_normalized = 'riviere pilote',
    department_code = '972',
    source_payload = '{"canton_code_2014":"97224","canton_name_2014":"Rivière-Pilote"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97224';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rivière-Salée',
    canton_name_2014_normalized = 'riviere salee',
    department_code = '972',
    source_payload = '{"canton_code_2014":"97225","canton_name_2014":"Rivière-Salée"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97225';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Pierre',
    canton_name_2014_normalized = 'saint pierre',
    department_code = '972',
    source_payload = '{"canton_code_2014":"97229","canton_name_2014":"Saint-Pierre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97229';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Trinité',
    canton_name_2014_normalized = 'trinite',
    department_code = '972',
    source_payload = '{"canton_code_2014":"97234","canton_name_2014":"Trinité"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97234';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Trois-Îlets',
    canton_name_2014_normalized = 'trois ilets',
    department_code = '972',
    source_payload = '{"canton_code_2014":"97235","canton_name_2014":"Trois-Îlets"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97235';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '972',
    source_payload = '{"canton_code_2014":"97294","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97294';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '972',
    source_payload = '{"canton_code_2014":"97295","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97295';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '972',
    source_payload = '{"canton_code_2014":"97296","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97296';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '972',
    source_payload = '{"canton_code_2014":"97297","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97297';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '972',
    source_payload = '{"canton_code_2014":"97298","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97298';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '972',
    source_payload = '{"canton_code_2014":"97299","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97299';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Approuague-Kaw',
    canton_name_2014_normalized = 'approuague kaw',
    department_code = '973',
    source_payload = '{"canton_code_2014":"97301","canton_name_2014":"Approuague-Kaw"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97301';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Georges-Oyapoc',
    canton_name_2014_normalized = 'saint georges oyapoc',
    department_code = '973',
    source_payload = '{"canton_code_2014":"97312","canton_name_2014":"Saint-Georges-Oyapoc"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97312';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montsinéry-Tonnegrande',
    canton_name_2014_normalized = 'montsinery tonnegrande',
    department_code = '973',
    source_payload = '{"canton_code_2014":"97315","canton_name_2014":"Montsinéry-Tonnegrande"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97315';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '973',
    source_payload = '{"canton_code_2014":"97399","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97399';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Étang-Salé',
    canton_name_2014_normalized = 'etang sale',
    department_code = '974',
    source_payload = '{"canton_code_2014":"97404","canton_name_2014":"Étang-Salé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97404';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Petite-Île',
    canton_name_2014_normalized = 'petite ile',
    department_code = '974',
    source_payload = '{"canton_code_2014":"97405","canton_name_2014":"Petite-Île"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97405';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Louis 3e  Canton',
    canton_name_2014_normalized = 'saint louis 3e canton',
    department_code = '974',
    source_payload = '{"canton_code_2014":"97422","canton_name_2014":"Saint-Louis 3e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97422';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '974',
    source_payload = '{"canton_code_2014":"97490","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97490';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '974',
    source_payload = '{"canton_code_2014":"97491","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97491';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '974',
    source_payload = '{"canton_code_2014":"97492","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97492';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '974',
    source_payload = '{"canton_code_2014":"97493","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97493';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '974',
    source_payload = '{"canton_code_2014":"97494","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97494';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '974',
    source_payload = '{"canton_code_2014":"97495","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97495';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '974',
    source_payload = '{"canton_code_2014":"97496","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97496';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '974',
    source_payload = '{"canton_code_2014":"97497","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97497';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '974',
    source_payload = '{"canton_code_2014":"97498","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97498';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '974',
    source_payload = '{"canton_code_2014":"97499","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97499';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bouéni',
    canton_name_2014_normalized = 'boueni',
    department_code = '976',
    source_payload = '{"canton_code_2014":"97604","canton_name_2014":"Bouéni"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97604';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Kani-Kéli',
    canton_name_2014_normalized = 'kani keli',
    department_code = '976',
    source_payload = '{"canton_code_2014":"97609","canton_name_2014":"Kani-Kéli"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97609';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '976',
    source_payload = '{"canton_code_2014":"97699","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '97699';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ambérieu-en-Bugey',
    canton_name_2014_normalized = 'amberieu en bugey',
    department_code = '01',
    source_payload = '{"canton_code_2014":"0101","canton_name_2014":"Ambérieu-en-Bugey"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0101';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bâgé-le-Châtel',
    canton_name_2014_normalized = 'bage le chatel',
    department_code = '01',
    source_payload = '{"canton_code_2014":"0102","canton_name_2014":"Bâgé-le-Châtel"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0102';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Belley',
    canton_name_2014_normalized = 'belley',
    department_code = '01',
    source_payload = '{"canton_code_2014":"0104","canton_name_2014":"Belley"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0104';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Brénod',
    canton_name_2014_normalized = 'brenod',
    department_code = '01',
    source_payload = '{"canton_code_2014":"0106","canton_name_2014":"Brénod"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0106';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ceyzériat',
    canton_name_2014_normalized = 'ceyzeriat',
    department_code = '01',
    source_payload = '{"canton_code_2014":"0107","canton_name_2014":"Ceyzériat"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0107';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Châtillon-sur-Chalaronne',
    canton_name_2014_normalized = 'chatillon sur chalaronne',
    department_code = '01',
    source_payload = '{"canton_code_2014":"0110","canton_name_2014":"Châtillon-sur-Chalaronne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0110';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Gex',
    canton_name_2014_normalized = 'gex',
    department_code = '01',
    source_payload = '{"canton_code_2014":"0114","canton_name_2014":"Gex"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0114';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Nantua',
    canton_name_2014_normalized = 'nantua',
    department_code = '01',
    source_payload = '{"canton_code_2014":"0122","canton_name_2014":"Nantua"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0122';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Oyonnax-Nord',
    canton_name_2014_normalized = 'oyonnax nord',
    department_code = '01',
    source_payload = '{"canton_code_2014":"0123","canton_name_2014":"Oyonnax-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0123';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Trévoux',
    canton_name_2014_normalized = 'trevoux',
    department_code = '01',
    source_payload = '{"canton_code_2014":"0134","canton_name_2014":"Trévoux"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0134';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Péronnas',
    canton_name_2014_normalized = 'peronnas',
    department_code = '01',
    source_payload = '{"canton_code_2014":"0139","canton_name_2014":"Péronnas"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0139';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Oyonnax-Sud',
    canton_name_2014_normalized = 'oyonnax sud',
    department_code = '01',
    source_payload = '{"canton_code_2014":"0141","canton_name_2014":"Oyonnax-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0141';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '01',
    source_payload = '{"canton_code_2014":"0198","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0198';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '01',
    source_payload = '{"canton_code_2014":"0199","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0199';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Anizy-le-Château',
    canton_name_2014_normalized = 'anizy le chateau',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0201","canton_name_2014":"Anizy-le-Château"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0201';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Château-Thierry',
    canton_name_2014_normalized = 'chateau thierry',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0208","canton_name_2014":"Château-Thierry"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0208';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Condé-en-Brie',
    canton_name_2014_normalized = 'conde en brie',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0210","canton_name_2014":"Condé-en-Brie"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0210';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Coucy-le-Château-Auffrique',
    canton_name_2014_normalized = 'coucy le chateau auffrique',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0211","canton_name_2014":"Coucy-le-Château-Auffrique"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0211';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Crécy-sur-Serre',
    canton_name_2014_normalized = 'crecy sur serre',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0213","canton_name_2014":"Crécy-sur-Serre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0213';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fère',
    canton_name_2014_normalized = 'fere',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0214","canton_name_2014":"Fère"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0214';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fère-en-Tardenois',
    canton_name_2014_normalized = 'fere en tardenois',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0215","canton_name_2014":"Fère-en-Tardenois"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0215';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Laon-Nord',
    canton_name_2014_normalized = 'laon nord',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0218","canton_name_2014":"Laon-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0218';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Moÿ-de-l''Aisne',
    canton_name_2014_normalized = 'moy de l aisne',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0220","canton_name_2014":"Moÿ-de-l''Aisne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0220';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Neufchâtel-sur-Aisne',
    canton_name_2014_normalized = 'neufchatel sur aisne',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0221","canton_name_2014":"Neufchâtel-sur-Aisne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0221';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Nouvion-en-Thiérache',
    canton_name_2014_normalized = 'nouvion en thierache',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0223","canton_name_2014":"Nouvion-en-Thiérache"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0223';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Oulchy-le-Château',
    canton_name_2014_normalized = 'oulchy le chateau',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0224","canton_name_2014":"Oulchy-le-Château"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0224';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Soissons-Nord',
    canton_name_2014_normalized = 'soissons nord',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0231","canton_name_2014":"Soissons-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0231';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vervins',
    canton_name_2014_normalized = 'vervins',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0234","canton_name_2014":"Vervins"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0234';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Villers-Cotterêts',
    canton_name_2014_normalized = 'villers cotterets',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0236","canton_name_2014":"Villers-Cotterêts"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0236';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Laon-Sud',
    canton_name_2014_normalized = 'laon sud',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0238","canton_name_2014":"Laon-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0238';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Quentin-Nord',
    canton_name_2014_normalized = 'saint quentin nord',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0239","canton_name_2014":"Saint-Quentin-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0239';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Quentin-Sud',
    canton_name_2014_normalized = 'saint quentin sud',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0240","canton_name_2014":"Saint-Quentin-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0240';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Soissons-Sud',
    canton_name_2014_normalized = 'soissons sud',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0241","canton_name_2014":"Soissons-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0241';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0297","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0297';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0298","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0298';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '02',
    source_payload = '{"canton_code_2014":"0299","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0299';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cérilly',
    canton_name_2014_normalized = 'cerilly',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0302","canton_name_2014":"Cérilly"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0302';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cusset-Nord',
    canton_name_2014_normalized = 'cusset nord',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0306","canton_name_2014":"Cusset-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0306';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ébreuil',
    canton_name_2014_normalized = 'ebreuil',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0309","canton_name_2014":"Ébreuil"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0309';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Hérisson',
    canton_name_2014_normalized = 'herisson',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0312","canton_name_2014":"Hérisson"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0312';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Lurcy-Lévis',
    canton_name_2014_normalized = 'lurcy levis',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0316","canton_name_2014":"Lurcy-Lévis"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0316';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montluçon-Est (4e Canton)',
    canton_name_2014_normalized = 'montlucon est 4e canton',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0320","canton_name_2014":"Montluçon-Est (4e Canton)"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0320';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montluçon-Ouest (2e Canton)',
    canton_name_2014_normalized = 'montlucon ouest 2e canton',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0321","canton_name_2014":"Montluçon-Ouest (2e Canton)"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0321';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Moulins-Sud',
    canton_name_2014_normalized = 'moulins sud',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0323","canton_name_2014":"Moulins-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0323';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Moulins-Ouest',
    canton_name_2014_normalized = 'moulins ouest',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0324","canton_name_2014":"Moulins-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0324';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Neuilly-le-Réal',
    canton_name_2014_normalized = 'neuilly le real',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0325","canton_name_2014":"Neuilly-le-Réal"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0325';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Pourçain-sur-Sioule',
    canton_name_2014_normalized = 'saint pourcain sur sioule',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0326","canton_name_2014":"Saint-Pourçain-sur-Sioule"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0326';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montluçon-Nord-Est (1er Canton)',
    canton_name_2014_normalized = 'montlucon nord est 1er canton',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0331","canton_name_2014":"Montluçon-Nord-Est (1er Canton)"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0331';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Montluçon-Sud (3e Canton)',
    canton_name_2014_normalized = 'montlucon sud 3e canton',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0332","canton_name_2014":"Montluçon-Sud (3e Canton)"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0332';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Domérat-Montluçon-Nord-Ouest',
    canton_name_2014_normalized = 'domerat montlucon nord ouest',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0334","canton_name_2014":"Domérat-Montluçon-Nord-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0334';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cusset-Sud',
    canton_name_2014_normalized = 'cusset sud',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0335","canton_name_2014":"Cusset-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0335';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0396","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0396';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0397","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0397';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0398","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0398';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '03',
    source_payload = '{"canton_code_2014":"0399","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0399';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Barrême',
    canton_name_2014_normalized = 'barreme',
    department_code = '04',
    source_payload = '{"canton_code_2014":"0405","canton_name_2014":"Barrême"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0405';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Allos-Colmars',
    canton_name_2014_normalized = 'allos colmars',
    department_code = '04',
    source_payload = '{"canton_code_2014":"0407","canton_name_2014":"Allos-Colmars"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0407';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Digne-les-Bains-Est',
    canton_name_2014_normalized = 'digne les bains est',
    department_code = '04',
    source_payload = '{"canton_code_2014":"0408","canton_name_2014":"Digne-les-Bains-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0408';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Forcalquier',
    canton_name_2014_normalized = 'forcalquier',
    department_code = '04',
    source_payload = '{"canton_code_2014":"0410","canton_name_2014":"Forcalquier"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0410';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Manosque-Nord',
    canton_name_2014_normalized = 'manosque nord',
    department_code = '04',
    source_payload = '{"canton_code_2014":"0413","canton_name_2014":"Manosque-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0413';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mées',
    canton_name_2014_normalized = 'mees',
    department_code = '04',
    source_payload = '{"canton_code_2014":"0414","canton_name_2014":"Mées"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0414';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mézel',
    canton_name_2014_normalized = 'mezel',
    department_code = '04',
    source_payload = '{"canton_code_2014":"0415","canton_name_2014":"Mézel"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0415';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-André-les-Alpes',
    canton_name_2014_normalized = 'saint andre les alpes',
    department_code = '04',
    source_payload = '{"canton_code_2014":"0422","canton_name_2014":"Saint-André-les-Alpes"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0422';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Étienne-les-Orgues',
    canton_name_2014_normalized = 'saint etienne les orgues',
    department_code = '04',
    source_payload = '{"canton_code_2014":"0423","canton_name_2014":"Saint-Étienne-les-Orgues"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0423';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Digne-les-Bains-Ouest',
    canton_name_2014_normalized = 'digne les bains ouest',
    department_code = '04',
    source_payload = '{"canton_code_2014":"0431","canton_name_2014":"Digne-les-Bains-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0431';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Manosque-Sud-Est',
    canton_name_2014_normalized = 'manosque sud est',
    department_code = '04',
    source_payload = '{"canton_code_2014":"0432","canton_name_2014":"Manosque-Sud-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0432';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Manosque-Sud-Ouest',
    canton_name_2014_normalized = 'manosque sud ouest',
    department_code = '04',
    source_payload = '{"canton_code_2014":"0433","canton_name_2014":"Manosque-Sud-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0433';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '04',
    source_payload = '{"canton_code_2014":"0497","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0497';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '04',
    source_payload = '{"canton_code_2014":"0498","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0498';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Argentière-la-Bessée',
    canton_name_2014_normalized = 'argentiere la bessee',
    department_code = '05',
    source_payload = '{"canton_code_2014":"0502","canton_name_2014":"Argentière-la-Bessée"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0502';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Aspres-sur-Buëch',
    canton_name_2014_normalized = 'aspres sur buech',
    department_code = '05',
    source_payload = '{"canton_code_2014":"0503","canton_name_2014":"Aspres-sur-Buëch"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0503';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bâtie-Neuve',
    canton_name_2014_normalized = 'batie neuve',
    department_code = '05',
    source_payload = '{"canton_code_2014":"0505","canton_name_2014":"Bâtie-Neuve"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0505';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Briançon-Nord',
    canton_name_2014_normalized = 'briancon nord',
    department_code = '05',
    source_payload = '{"canton_code_2014":"0506","canton_name_2014":"Briançon-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0506';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Gap-Campagne',
    canton_name_2014_normalized = 'gap campagne',
    department_code = '05',
    source_payload = '{"canton_code_2014":"0509","canton_name_2014":"Gap-Campagne"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0509';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Laragne-Montéglin',
    canton_name_2014_normalized = 'laragne monteglin',
    department_code = '05',
    source_payload = '{"canton_code_2014":"0512","canton_name_2014":"Laragne-Montéglin"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0512';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Monêtier-les-Bains',
    canton_name_2014_normalized = 'monetier les bains',
    department_code = '05',
    source_payload = '{"canton_code_2014":"0513","canton_name_2014":"Monêtier-les-Bains"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0513';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Orcières',
    canton_name_2014_normalized = 'orcieres',
    department_code = '05',
    source_payload = '{"canton_code_2014":"0514","canton_name_2014":"Orcières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0514';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Dévoluy',
    canton_name_2014_normalized = 'devoluy',
    department_code = '05',
    source_payload = '{"canton_code_2014":"0519","canton_name_2014":"Dévoluy"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0519';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Briançon-Sud',
    canton_name_2014_normalized = 'briancon sud',
    department_code = '05',
    source_payload = '{"canton_code_2014":"0525","canton_name_2014":"Briançon-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0525';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '05',
    source_payload = '{"canton_code_2014":"0598","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0598';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '05',
    source_payload = '{"canton_code_2014":"0599","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0599';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Antibes-Biot',
    canton_name_2014_normalized = 'antibes biot',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0601","canton_name_2014":"Antibes-Biot"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0601';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Laurent-du-Var-Cagnes-sur-Mer-Est',
    canton_name_2014_normalized = 'saint laurent du var cagnes sur mer est',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0605","canton_name_2014":"Saint-Laurent-du-Var-Cagnes-sur-Mer-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0605';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Escarène',
    canton_name_2014_normalized = 'escarene',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0609","canton_name_2014":"Escarène"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0609';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Grasse-Sud',
    canton_name_2014_normalized = 'grasse sud',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0610","canton_name_2014":"Grasse-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0610';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Menton-Est',
    canton_name_2014_normalized = 'menton est',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0613","canton_name_2014":"Menton-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0613';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Puget-Théniers',
    canton_name_2014_normalized = 'puget theniers',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0618","canton_name_2014":"Puget-Théniers"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0618';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Roquebillière',
    canton_name_2014_normalized = 'roquebilliere',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0619","canton_name_2014":"Roquebillière"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0619';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Roquestéron',
    canton_name_2014_normalized = 'roquesteron',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0620","canton_name_2014":"Roquestéron"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0620';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Étienne-de-Tinée',
    canton_name_2014_normalized = 'saint etienne de tinee',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0622","canton_name_2014":"Saint-Étienne-de-Tinée"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0622';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Martin-Vésubie',
    canton_name_2014_normalized = 'saint martin vesubie',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0623","canton_name_2014":"Saint-Martin-Vésubie"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0623';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Sauveur-sur-Tinée',
    canton_name_2014_normalized = 'saint sauveur sur tinee',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0624","canton_name_2014":"Saint-Sauveur-sur-Tinée"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0624';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vallauris-Antibes-Ouest',
    canton_name_2014_normalized = 'vallauris antibes ouest',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0635","canton_name_2014":"Vallauris-Antibes-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0635';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mandelieu-Cannes-Ouest',
    canton_name_2014_normalized = 'mandelieu cannes ouest',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0636","canton_name_2014":"Mandelieu-Cannes-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0636';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Nice 13e  Canton',
    canton_name_2014_normalized = 'nice 13e canton',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0643","canton_name_2014":"Nice 13e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0643';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cagnes-sur-Mer-Ouest',
    canton_name_2014_normalized = 'cagnes sur mer ouest',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0645","canton_name_2014":"Cagnes-sur-Mer-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0645';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Menton-Ouest',
    canton_name_2014_normalized = 'menton ouest',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0652","canton_name_2014":"Menton-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0652';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0693","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0693';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0694","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0694';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0695","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0695';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0696","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0696';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0697","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0697';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0698","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0698';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '06',
    source_payload = '{"canton_code_2014":"0699","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0699';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Annonay-Nord',
    canton_name_2014_normalized = 'annonay nord',
    department_code = '07',
    source_payload = '{"canton_code_2014":"0701","canton_name_2014":"Annonay-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0701';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bourg-Saint-Andéol',
    canton_name_2014_normalized = 'bourg saint andeol',
    department_code = '07',
    source_payload = '{"canton_code_2014":"0704","canton_name_2014":"Bourg-Saint-Andéol"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0704';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Chomérac',
    canton_name_2014_normalized = 'chomerac',
    department_code = '07',
    source_payload = '{"canton_code_2014":"0707","canton_name_2014":"Chomérac"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0707';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Largentière',
    canton_name_2014_normalized = 'largentiere',
    department_code = '07',
    source_payload = '{"canton_code_2014":"0711","canton_name_2014":"Largentière"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0711';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Privas',
    canton_name_2014_normalized = 'privas',
    department_code = '07',
    source_payload = '{"canton_code_2014":"0713","canton_name_2014":"Privas"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0713';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Agrève',
    canton_name_2014_normalized = 'saint agreve',
    department_code = '07',
    source_payload = '{"canton_code_2014":"0715","canton_name_2014":"Saint-Agrève"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0715';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Étienne-de-Lugdarès',
    canton_name_2014_normalized = 'saint etienne de lugdares',
    department_code = '07',
    source_payload = '{"canton_code_2014":"0716","canton_name_2014":"Saint-Étienne-de-Lugdarès"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0716';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Félicien',
    canton_name_2014_normalized = 'saint felicien',
    department_code = '07',
    source_payload = '{"canton_code_2014":"0717","canton_name_2014":"Saint-Félicien"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0717';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Péray',
    canton_name_2014_normalized = 'saint peray',
    department_code = '07',
    source_payload = '{"canton_code_2014":"0719","canton_name_2014":"Saint-Péray"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0719';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Serrières',
    canton_name_2014_normalized = 'serrieres',
    department_code = '07',
    source_payload = '{"canton_code_2014":"0722","canton_name_2014":"Serrières"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0722';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Tournon-sur-Rhône',
    canton_name_2014_normalized = 'tournon sur rhone',
    department_code = '07',
    source_payload = '{"canton_code_2014":"0724","canton_name_2014":"Tournon-sur-Rhône"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0724';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Voulte-sur-Rhône',
    canton_name_2014_normalized = 'voulte sur rhone',
    department_code = '07',
    source_payload = '{"canton_code_2014":"0731","canton_name_2014":"Voulte-sur-Rhône"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0731';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Annonay-Sud',
    canton_name_2014_normalized = 'annonay sud',
    department_code = '07',
    source_payload = '{"canton_code_2014":"0732","canton_name_2014":"Annonay-Sud"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0732';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '07',
    source_payload = '{"canton_code_2014":"0799","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0799';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Charleville-Centre',
    canton_name_2014_normalized = 'charleville centre',
    department_code = '08',
    source_payload = '{"canton_code_2014":"0805","canton_name_2014":"Charleville-Centre"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0805';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Château-Porcien',
    canton_name_2014_normalized = 'chateau porcien',
    department_code = '08',
    source_payload = '{"canton_code_2014":"0806","canton_name_2014":"Château-Porcien"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0806';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Grandpré',
    canton_name_2014_normalized = 'grandpre',
    department_code = '08',
    source_payload = '{"canton_code_2014":"0812","canton_name_2014":"Grandpré"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0812';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mézières-Centre-Ouest',
    canton_name_2014_normalized = 'mezieres centre ouest',
    department_code = '08',
    source_payload = '{"canton_code_2014":"0815","canton_name_2014":"Mézières-Centre-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0815';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Monthermé',
    canton_name_2014_normalized = 'montherme',
    department_code = '08',
    source_payload = '{"canton_code_2014":"0816","canton_name_2014":"Monthermé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0816';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Rethel',
    canton_name_2014_normalized = 'rethel',
    department_code = '08',
    source_payload = '{"canton_code_2014":"0823","canton_name_2014":"Rethel"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0823';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sedan-Nord',
    canton_name_2014_normalized = 'sedan nord',
    department_code = '08',
    source_payload = '{"canton_code_2014":"0826","canton_name_2014":"Sedan-Nord"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0826';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sedan-Est',
    canton_name_2014_normalized = 'sedan est',
    department_code = '08',
    source_payload = '{"canton_code_2014":"0827","canton_name_2014":"Sedan-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0827';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Vouziers',
    canton_name_2014_normalized = 'vouziers',
    department_code = '08',
    source_payload = '{"canton_code_2014":"0831","canton_name_2014":"Vouziers"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0831';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Charleville-La Houillère',
    canton_name_2014_normalized = 'charleville la houillere',
    department_code = '08',
    source_payload = '{"canton_code_2014":"0832","canton_name_2014":"Charleville-La Houillère"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0832';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Mézières-Est',
    canton_name_2014_normalized = 'mezieres est',
    department_code = '08',
    source_payload = '{"canton_code_2014":"0833","canton_name_2014":"Mézières-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0833';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sedan-Ouest',
    canton_name_2014_normalized = 'sedan ouest',
    department_code = '08',
    source_payload = '{"canton_code_2014":"0836","canton_name_2014":"Sedan-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0836';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '08',
    source_payload = '{"canton_code_2014":"0898","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0898';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '08',
    source_payload = '{"canton_code_2014":"0899","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0899';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bastide-de-Sérou',
    canton_name_2014_normalized = 'bastide de serou',
    department_code = '09',
    source_payload = '{"canton_code_2014":"0902","canton_name_2014":"Bastide-de-Sérou"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0902';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Foix-Ville',
    canton_name_2014_normalized = 'foix ville',
    department_code = '09',
    source_payload = '{"canton_code_2014":"0905","canton_name_2014":"Foix-Ville"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0905';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pamiers-Ouest',
    canton_name_2014_normalized = 'pamiers ouest',
    department_code = '09',
    source_payload = '{"canton_code_2014":"0912","canton_name_2014":"Pamiers-Ouest"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0912';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Quérigut',
    canton_name_2014_normalized = 'querigut',
    department_code = '09',
    source_payload = '{"canton_code_2014":"0913","canton_name_2014":"Quérigut"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0913';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Saint-Girons',
    canton_name_2014_normalized = 'saint girons',
    department_code = '09',
    source_payload = '{"canton_code_2014":"0915","canton_name_2014":"Saint-Girons"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0915';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Tarascon-sur-Ariège',
    canton_name_2014_normalized = 'tarascon sur ariege',
    department_code = '09',
    source_payload = '{"canton_code_2014":"0918","canton_name_2014":"Tarascon-sur-Ariège"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0918';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Foix-Rural',
    canton_name_2014_normalized = 'foix rural',
    department_code = '09',
    source_payload = '{"canton_code_2014":"0921","canton_name_2014":"Foix-Rural"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0921';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Pamiers-Est',
    canton_name_2014_normalized = 'pamiers est',
    department_code = '09',
    source_payload = '{"canton_code_2014":"0922","canton_name_2014":"Pamiers-Est"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0922';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '09',
    source_payload = '{"canton_code_2014":"0999","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '0999';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Celavo-Mezzana',
    canton_name_2014_normalized = 'celavo mezzana',
    department_code = '2A',
    source_payload = '{"canton_code_2014":"2A06","canton_name_2014":"Celavo-Mezzana"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2A06';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Deux-Sevi',
    canton_name_2014_normalized = 'deux sevi',
    department_code = '2A',
    source_payload = '{"canton_code_2014":"2A35","canton_name_2014":"Deux-Sevi"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2A35';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Santa-Maria-Siché',
    canton_name_2014_normalized = 'santa maria siche',
    department_code = '2A',
    source_payload = '{"canton_code_2014":"2A48","canton_name_2014":"Santa-Maria-Siché"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2A48';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Cruzini-Cinarca',
    canton_name_2014_normalized = 'cruzini cinarca',
    department_code = '2A',
    source_payload = '{"canton_code_2014":"2A51","canton_name_2014":"Cruzini-Cinarca"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2A51';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sartène',
    canton_name_2014_normalized = 'sartene',
    department_code = '2A',
    source_payload = '{"canton_code_2014":"2A53","canton_name_2014":"Sartène"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2A53';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Tallano-Scopamène',
    canton_name_2014_normalized = 'tallano scopamene',
    department_code = '2A',
    source_payload = '{"canton_code_2014":"2A55","canton_name_2014":"Tallano-Scopamène"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2A55';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Deux-Sorru',
    canton_name_2014_normalized = 'deux sorru',
    department_code = '2A',
    source_payload = '{"canton_code_2014":"2A61","canton_name_2014":"Deux-Sorru"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2A61';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Ajaccio  7e  Canton',
    canton_name_2014_normalized = 'ajaccio 7e canton',
    department_code = '2A',
    source_payload = '{"canton_code_2014":"2A73","canton_name_2014":"Ajaccio  7e  Canton"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2A73';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '2A',
    source_payload = '{"canton_code_2014":"2A98","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2A98';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Belgodère',
    canton_name_2014_normalized = 'belgodere',
    department_code = '2B',
    source_payload = '{"canton_code_2014":"2B05","canton_name_2014":"Belgodère"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2B05';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Sagro-di-Santa-Giulia',
    canton_name_2014_normalized = 'sagro di santa giulia',
    department_code = '2B',
    source_payload = '{"canton_code_2014":"2B09","canton_name_2014":"Sagro-di-Santa-Giulia"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2B09';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Niolu-Omessa',
    canton_name_2014_normalized = 'niolu omessa',
    department_code = '2B',
    source_payload = '{"canton_code_2014":"2B10","canton_name_2014":"Niolu-Omessa"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2B10';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Alto-di-Casaconi',
    canton_name_2014_normalized = 'alto di casaconi',
    department_code = '2B',
    source_payload = '{"canton_code_2014":"2B14","canton_name_2014":"Alto-di-Casaconi"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2B14';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Campoloro-di-Moriani',
    canton_name_2014_normalized = 'campoloro di moriani',
    department_code = '2B',
    source_payload = '{"canton_code_2014":"2B16","canton_name_2014":"Campoloro-di-Moriani"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2B16';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Île-Rousse',
    canton_name_2014_normalized = 'ile rousse',
    department_code = '2B',
    source_payload = '{"canton_code_2014":"2B20","canton_name_2014":"Île-Rousse"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2B20';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Moïta-Verde',
    canton_name_2014_normalized = 'moita verde',
    department_code = '2B',
    source_payload = '{"canton_code_2014":"2B24","canton_name_2014":"Moïta-Verde"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2B24';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Castifao-Morosaglia',
    canton_name_2014_normalized = 'castifao morosaglia',
    department_code = '2B',
    source_payload = '{"canton_code_2014":"2B25","canton_name_2014":"Castifao-Morosaglia"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2B25';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Haut-Nebbio',
    canton_name_2014_normalized = 'haut nebbio',
    department_code = '2B',
    source_payload = '{"canton_code_2014":"2B26","canton_name_2014":"Haut-Nebbio"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2B26';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Conca-d''Oro',
    canton_name_2014_normalized = 'conca d oro',
    department_code = '2B',
    source_payload = '{"canton_code_2014":"2B29","canton_name_2014":"Conca-d''Oro"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2B29';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Orezza-Alesani',
    canton_name_2014_normalized = 'orezza alesani',
    department_code = '2B',
    source_payload = '{"canton_code_2014":"2B37","canton_name_2014":"Orezza-Alesani"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2B37';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Fiumalto-d''Ampugnani',
    canton_name_2014_normalized = 'fiumalto d ampugnani',
    department_code = '2B',
    source_payload = '{"canton_code_2014":"2B39","canton_name_2014":"Fiumalto-d''Ampugnani"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2B39';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Capobianco',
    canton_name_2014_normalized = 'capobianco',
    department_code = '2B',
    source_payload = '{"canton_code_2014":"2B42","canton_name_2014":"Capobianco"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2B42';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bustanico',
    canton_name_2014_normalized = 'bustanico',
    department_code = '2B',
    source_payload = '{"canton_code_2014":"2B54","canton_name_2014":"Bustanico"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2B54';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Bastia  6e  (Canton Furiani-Montésoro)',
    canton_name_2014_normalized = 'bastia 6e canton furiani montesoro',
    department_code = '2B',
    source_payload = '{"canton_code_2014":"2B71","canton_name_2014":"Bastia  6e  (Canton Furiani-Montésoro)"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2B71';

UPDATE public.mdall_climate_commune_cantons
SET canton_name_2014 = 'Canton non précisé',
    canton_name_2014_normalized = 'canton non precise',
    department_code = '2B',
    source_payload = '{"canton_code_2014":"2B99","canton_name_2014":"Canton non précisé"}'::jsonb,
    updated_at = now()
WHERE insee_code IS NULL AND canton_code_2014 = '2B99';

COMMIT;
