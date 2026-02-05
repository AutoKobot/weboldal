import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Shield, Mail, Clock, Download, Trash2, Edit, StopCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Vissza a főoldalra
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Adatvédelmi Tájékoztató
            </h1>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Shield className="h-3 w-3 mr-1" />
            GDPR megfelelő
          </Badge>
          <Badge variant="outline">
            Magyar Info törvény 2011. évi CXII. tv.
          </Badge>
          <Badge variant="outline">
            Utolsó frissítés: 2025. augusztus 25.
          </Badge>
        </div>

        {/* Data Controller Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Adatkezelő adatai
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-semibold">Adatkezelő neve:</h4>
              <p>Global Learning System Kft.</p>
            </div>
            <div>
              <h4 className="font-semibold">Székhely:</h4>
              <p>1111 Budapest, Példa utca 1. (példa cím)</p>
            </div>
            <div>
              <h4 className="font-semibold">Kapcsolat:</h4>
              <p>Email: privacy@globalsystem.com</p>
              <p>Telefon: +36 1 234 5678</p>
            </div>
            <div>
              <h4 className="font-semibold">Adatvédelmi tisztviselő:</h4>
              <p>dpo@globalsystem.com</p>
            </div>
          </CardContent>
        </Card>

        {/* Data Processing Activities */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Adatkezelési tevékenységek</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold mb-2">1. Felhasználói regisztráció és bejelentkezés</h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p><strong>Kezelt adatok:</strong> név, email cím, felhasználónév, jelszó (titkosítva)</p>
                <p><strong>Jogalap:</strong> hozzájárulás (GDPR 6. cikk 1. pont a)</p>
                <p><strong>Cél:</strong> felhasználói fiók létrehozása és kezelése</p>
                <p><strong>Megőrzési idő:</strong> a fiók törlésig vagy 3 év inaktivitás után</p>
              </div>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold mb-2">2. Oktatási tartalom és haladás követése</h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p><strong>Kezelt adatok:</strong> tanulási modulok teljesítése, pontszámok, haladási adatok</p>
                <p><strong>Jogalap:</strong> szolgáltatás teljesítése (GDPR 6. cikk 1. pont b)</p>
                <p><strong>Cél:</strong> oktatási szolgáltatás nyújtása, haladás nyomon követése</p>
                <p><strong>Megőrzési idő:</strong> a szolgáltatás használatának befejezésétől számított 5 év</p>
              </div>
            </div>

            <div className="border-l-4 border-orange-500 pl-4">
              <h4 className="font-semibold mb-2">3. AI szolgáltatások és API hívások</h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p><strong>Kezelt adatok:</strong> API használati statisztikák, költségadatok felhasználóhoz rendelve</p>
                <p><strong>Jogalap:</strong> jogos érdek (GDPR 6. cikk 1. pont f)</p>
                <p><strong>Cél:</strong> szolgáltatás optimalizálása, költségkontroll</p>
                <p><strong>Megőrzési idő:</strong> 2 év</p>
              </div>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold mb-2">4. Munkamenetkezelés (session adatok)</h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p><strong>Kezelt adatok:</strong> session azonosító, bejelentkezési státusz</p>
                <p><strong>Jogalap:</strong> jogos érdek (GDPR 6. cikk 1. pont f)</p>
                <p><strong>Cél:</strong> biztonságos munkamenet fenntartása</p>
                <p><strong>Megőrzési idő:</strong> 7 nap vagy kijelentkezés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Rights */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Az Ön jogai</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Download className="h-5 w-5 text-blue-500 mt-1" />
                <div>
                  <h4 className="font-semibold">Adathordozhatóság</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Kérheti adatai géppel olvasható formátumban történő kiadását.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Edit className="h-5 w-5 text-green-500 mt-1" />
                <div>
                  <h4 className="font-semibold">Helyesbítés</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Kérheti pontatlan vagy hiányos adatai javítását.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Trash2 className="h-5 w-5 text-red-500 mt-1" />
                <div>
                  <h4 className="font-semibold">Törlés</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Kérheti személyes adatai törlését („elfeledtetéshez való jog").
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <StopCircle className="h-5 w-5 text-orange-500 mt-1" />
                <div>
                  <h4 className="font-semibold">Korlátozás</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Kérheti adatkezelés korlátozását bizonyos esetekben.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Hogyan érvényesítse jogait?</h4>
              <p className="text-sm mb-3">
                Jogai érvényesítéséhez írjon nekünk a privacy@globalsystem.com címre, 
                vagy használja a <Link href="/privacy-requests" className="text-blue-600 hover:underline">
                online kérelem rendszert</Link>.
              </p>
              <p className="text-sm">
                <strong>Válaszidő:</strong> Kérelmét 30 napon belül elbíráluk és válaszolunk.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cookies and Tracking */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sütik (cookies) és nyomkövetés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold">Szükséges sütik</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  A weboldal alapvető működéséhez szükségesek (bejelentkezés, navigáció, biztonság).
                  Ezek letiltása esetén a weboldal nem működik megfelelően.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Funkcionális sütik</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  A felhasználói élmény javítására szolgálnak (beállítások megjegyzése, személyre szabás).
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Analitikai sütik</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Névtelen statisztikák gyűjtésére a weboldal használatáról, a szolgáltatás fejlesztése érdekében.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Marketing sütik</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Személyre szabott tartalom és releváns ajánlatok megjelenítésére.
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <p className="text-sm">
                <strong>Süti beállítások módosítása:</strong> A süti banner újboli megjelenítéséhez 
                törlje a böngésző helyi tárolójában (localStorage) a "cookie-consent" bejegyzést, 
                majd frissítse az oldalt.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Adatbiztonság</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold">Technikai védelmi intézkedések:</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc list-inside space-y-1">
                  <li>HTTPS titkosítás minden kommunikációban</li>
                  <li>Jelszavak biztonságos hash-elése (scrypt)</li>
                  <li>Adatbázis access control és monitoring</li>
                  <li>Rendszeres biztonsági frissítések</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold">Szervezési intézkedések:</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc list-inside space-y-1">
                  <li>Adatvédelmi tisztviselő kijelölése</li>
                  <li>Munkatársak adatvédelmi képzése</li>
                  <li>Adatkezelési folyamatok dokumentálása</li>
                  <li>Incidenskezelési eljárások</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact and Complaints */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Kapcsolat és panaszkezelés</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold">Adatvédelmi kérdések:</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  privacy@globalsystem.com | +36 1 234 5678
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Panaszkezelés:</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Panaszait először nálunk jelezheti (privacy@globalsystem.com). 
                  Elégedetlenség esetén fordulhat a Nemzeti Adatvédelmi és Információszabadság Hatósághoz 
                  (NAIH): <a href="https://naih.hu" className="text-blue-600 hover:underline">naih.hu</a>
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Hatósági kapcsolat:</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Nemzeti Adatvédelmi és Információszabadság Hatóság<br/>
                  1055 Budapest, Falk Miksa utca 9-11.<br/>
                  Email: ugyfelszolgalat@naih.hu | Tel: +36 1 391 1400
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Links to other pages */}
        <Card>
          <CardHeader>
            <CardTitle>További információk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/privacy-requests">
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Adatvédelmi kérelmek
                </Button>
              </Link>
              <Link href="/terms-of-service">
                <Button variant="outline">
                  Általános Szerződési Feltételek
                </Button>
              </Link>
              <a href="mailto:privacy@globalsystem.com" className="inline-block">
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Kapcsolat
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}