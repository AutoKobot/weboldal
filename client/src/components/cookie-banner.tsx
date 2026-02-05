import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Settings, Shield, Cookie } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';

interface ConsentSettings {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const DEFAULT_CONSENT: ConsentSettings = {
  necessary: true, // Always true, cannot be disabled
  analytics: false,
  marketing: false,
  functional: false
};

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState<ConsentSettings>(DEFAULT_CONSENT);

  useEffect(() => {
    // Check if user has already given consent
    const storedConsent = localStorage.getItem('cookie-consent');
    if (!storedConsent) {
      setShowBanner(true);
    } else {
      setConsent(JSON.parse(storedConsent));
    }
  }, []);

  const saveConsent = async (consentData: ConsentSettings) => {
    try {
      // Save to localStorage for immediate use
      localStorage.setItem('cookie-consent', JSON.stringify(consentData));
      localStorage.setItem('cookie-consent-date', new Date().toISOString());
      
      // Save to backend if user is logged in
      const sessionId = Math.random().toString(36).substring(2, 15);
      
      // Save each consent type
      for (const [type, value] of Object.entries(consentData)) {
        try {
          await apiRequest('POST', '/api/privacy/consent', {
            consentType: type,
            consentValue: value,
            sessionId
          });
        } catch (error) {
          // Continue if backend call fails
          console.warn('Failed to save consent to backend:', error);
        }
      }
      
      setConsent(consentData);
      setShowBanner(false);
      setShowSettings(false);
    } catch (error) {
      console.error('Error saving consent:', error);
    }
  };

  const acceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true
    });
  };

  const acceptNecessary = () => {
    saveConsent(DEFAULT_CONSENT);
  };

  const saveCustom = () => {
    saveConsent(consent);
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <Card className="max-w-4xl mx-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Cookie className="h-8 w-8 text-orange-500" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                      🍪 Sütikezelési tájékoztatás
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
                      A Global Learning System sütiket és hasonló technológiákat használ a weboldal működéséhez, 
                      teljesítményének javításához és személyre szabott tartalom biztosításához. 
                      Az <Link href="/privacy-policy" className="text-blue-600 hover:underline">adatvédelmi tájékoztatónkban</Link> részletesen 
                      olvashat arról, hogy milyen adatokat gyűjtünk és hogyan használjuk fel őket.
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        GDPR megfelelő
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Magyar adatvédelmi jogszabályok
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBanner(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={acceptAll}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Összes süti elfogadása
                  </Button>
                  
                  <Button
                    onClick={acceptNecessary}
                    variant="outline"
                  >
                    Csak szükséges sütik
                  </Button>
                  
                  <Dialog open={showSettings} onOpenChange={setShowSettings}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Beállítások
                      </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Cookie className="h-5 w-5 text-orange-500" />
                          Süti beállítások
                        </DialogTitle>
                        <DialogDescription>
                          Válassza ki, hogy milyen típusú sütiket engedélyez. A szükséges sütik mindig aktívak a weboldal működéséhez.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        {/* Necessary Cookies */}
                        <div className="flex items-start justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Label className="font-medium">Szükséges sütik</Label>
                              <Badge variant="secondary" className="text-xs">Kötelező</Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Ezek a sütik elengedhetetlenek a weboldal alapvető funkcióihoz, 
                              mint a bejelentkezés, navigáció és biztonság.
                            </p>
                          </div>
                          <Switch checked={true} disabled />
                        </div>
                        
                        {/* Functional Cookies */}
                        <div className="flex items-start justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <Label className="font-medium mb-2 block">Funkcionális sütik</Label>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Javítják a felhasználói élményt, megjegyzik a beállításokat 
                              és preferenciákat (pl. nyelv, téma).
                            </p>
                          </div>
                          <Switch 
                            checked={consent.functional}
                            onCheckedChange={(checked) => 
                              setConsent(prev => ({ ...prev, functional: checked }))
                            }
                          />
                        </div>
                        
                        {/* Analytics Cookies */}
                        <div className="flex items-start justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <Label className="font-medium mb-2 block">Analitikai sütik</Label>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Segítenek megérteni, hogyan használja a weboldalt, 
                              így javíthatjuk a szolgáltatásainkat. Az adatok névtelenek.
                            </p>
                          </div>
                          <Switch 
                            checked={consent.analytics}
                            onCheckedChange={(checked) => 
                              setConsent(prev => ({ ...prev, analytics: checked }))
                            }
                          />
                        </div>
                        
                        {/* Marketing Cookies */}
                        <div className="flex items-start justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <Label className="font-medium mb-2 block">Marketing sütik</Label>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Személyre szabott tartalmak és releváns ajánlatok 
                              megjelenítéséhez használjuk.
                            </p>
                          </div>
                          <Switch 
                            checked={consent.marketing}
                            onCheckedChange={(checked) => 
                              setConsent(prev => ({ ...prev, marketing: checked }))
                            }
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setShowSettings(false)}>
                          Mégse
                        </Button>
                        <Button onClick={saveCustom} className="bg-green-600 hover:bg-green-700">
                          Beállítások mentése
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}