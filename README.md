[seamk_logo]:       /img/Seamk_logo.svg
[epliitto_logo]:    /img/EPLiitto_logo_vaaka_vari.jpg
[screenshot]:       /img/screenshot.jpg

# Autoveron ennakointi

Tekoäly-AKKE hankkeessa yhtenä demona loimme autoveron ennakointi työkalun. Se lukee verottajalta saatavilla olevat veropäätökset sisään ja koneoppimista hyväksikäyttäen antaa mahdollisuuden ennakoida mikä voisi olla jonkin tietyn ikäisen automallin verotusarvo ja autovero. 

Ohjelma laskee oletun verotusarvon merkki ja mallikohtaisesti, ottaen ajetut kilometrit, iän päätöksen tekohetkellä ja moottorin kuutiotilavuuden huomioon. 

Muista, että tästä saat vain arvauksen, verottaja varsinaisen päätöksen kun sen aika koittaa. 

## Luo ajoympäristö

Ohjelma on kirjoitettu pythonilla, joten oletamme alla, että se on jo asennettuna. Kun olet kloonannut repositoryn johonkin hakemistoon, luo sinne 

```
python -m venv venv
```

Aktivoi ympäristö linux/mac `source venv/bin/activate`, windows powershell `.\venv\Scripts\Activate.ps1`. Tämän jälkeen voi asentaa tarvittavat kirjastot tähän virtuaaliympäristöön. 

```
pip install --upgrade pip wheel
pip install --upgrade scikit-learn flask pandas numpy tqdm xlrd
```

## Hae data

Tätä kirjoittaessa autoveropäätökset löytyvät Verohallinnon sivuilta seuraavasta osoitteesta: https://www.vero.fi/henkiloasiakkaat/auto/autoverotus/autoveron_maara/taulukoita_ajoneuvojen_sovelletuista_ve/

Ohjelma osaa lukea henkilö- ja pakettiautojen päätökset, myös useammalta vuodelta. Jos haluat päästä hieman helpommalla, tallenna tiedostot `data` hakemistoon app.py:n rinnalle. Siten ei tarvitse erikseen kertoa mistä tietoja etsitään. 

## Käynnistä palvelin 

```
python app.py [-h] [--port [PORT]] [--pickleFile [PICKLEFILE]] [data]
```

Mikäli tiedot löytyvät yllä mainitusta hakemistosta ja oletus palvelinportti 5555 sopii sinulle, ei mitään parametreja tarvitse lisätä. 

Windows-käyttäjille on myös start.bat, jolla voit käynnistää palvelimen seuraavalla kertaa suoraan ilman ympäristön aktivointia. 

Käynnistyminen kestää pienen tovin, verottajan excelit luetaan joka kerta sisään. Jos käynnistys onnistui, tulostuu palvelimen osoite: 

```
* Running on http://127.0.0.1:5555
Press CTRL+C to quit
```

## Avaa selaimeen

Avaa tulostunut osoite selaimeen ja käyttöliittymän pitäisi ilmestyä näkyviin.

## Lopetus

Kuten tulostus yllä ohjeistaa, sammuta palvelin painamalla CTRL+C siinä terminaalissa missä sen käynnistit.

## Käyttöliittymä

![screenshot]

Yläreunasta voit valita valmistajan ja mallin. Tämä populoi taulukon ja graafin. Mallin vaihdoin jälkeen mittarilukemaksi, iäksi ja veroprosentiksi otetaan valitun mallin keskiarvo. 

Voit selata listaa läpi ja järjestellä sitä sarakkaiden mukaan. Viemällä hiiren taulukon riville graafissa vastaava pallo highlightautuu, toimii myös päinvastoin. 

Mittarilukeman ja iän muuttaminen liikuttaa piirrettyjä vaaka- ja pystyviivoja sekä päivittäen ennustetta verotusarvosta. Voit myös muuttaa käytettyä veroprosenttia.

## Tekoäly-AKKE hanke

Syksystä 2021 syksyyn 2022 kestävässä hankkeessa selvitetään Etelä-Pohjanmaan alueen yritysten tietoja ja tarpeita tekoälyn käytöstä sekä tuodaan esille tapoja sen käyttämiseen eri tapauksissa, innostaen laajempaa käyttöä tällä uudelle teknologialle alueella. Hanketta on rahoittanut Etelä-Pohjanmaan liitto.

![epliitto_logo]

---

![seamk_logo]
