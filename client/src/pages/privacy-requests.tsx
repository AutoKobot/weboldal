import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Download, 
  Trash2, 
  Edit, 
  StopCircle, 
  FileText, 
  CheckCircle, 
  Clock,
  AlertTriangle 
} from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface PrivacyRequest {
  id: number;
  email: string;
  requestType: 'data_export' | 'data_deletion' | 'data_correction' | 'restrict_processing';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  requestData: any;
  responseData: any;
  createdAt: string;
  completedAt?: string;
}

const REQUEST_TYPES = {
  data_export: {
    icon: Download,
    label: 'Adatok exportálása',
    description: 'Az összes rólam tárolt adat kérése géppel olvasható formátumban',
    color: 'blue'
  },
  data_deletion: {
    icon: Trash2,
    label: 'Adatok törlése',
    description: 'Az összes rólam tárolt adat törlése (elfeledtetéshez való jog)',
    color: 'red'
  },
  data_correction: {
    icon: Edit,
    label: 'Adatok javítása',
    description: 'Pontatlan vagy hiányos adataim javítása',
    color: 'green'
  },
  restrict_processing: {
    icon: StopCircle,
    label: 'Adatkezelés korlátozása',
    description: 'Adataim kezelésének korlátozása vagy felfüggesztése',
    color: 'orange'
  }
};

const STATUS_CONFIG = {
  pending: { label: 'Függőben', icon: Clock, color: 'yellow' },
  in_progress: { label: 'Feldolgozás alatt', icon: FileText, color: 'blue' },
  completed: { label: 'Befejezve', icon: CheckCircle, color: 'green' },
  rejected: { label: 'Elutasítva', icon: AlertTriangle, color: 'red' }
};

export default function PrivacyRequests() {
  const [requestType, setRequestType] = useState<string>('');
  const [email, setEmail] = useState('');
  const [details, setDetails] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing requests for the user
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['/api/privacy/requests'],
    enabled: !!email && email.includes('@'),
  });

  const submitRequestMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/privacy/requests', data),
    onSuccess: () => {
      toast({
        title: "Kérelem elküldve",
        description: "Adatvédelmi kérelmét sikeresen rögzítettük. 30 napon belül válaszolunk.",
      });
      setRequestType('');
      setDetails('');
      queryClient.invalidateQueries({ queryKey: ['/api/privacy/requests'] });
    },
    onError: () => {
      toast({
        title: "Hiba történt",
        description: "Nem sikerült elküldeni a kérelmet. Kérjük próbálja újra.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !requestType) {
      toast({
        title: "Hiányos adatok",
        description: "Kérjük adja meg az email címét és válassza ki a kérelem típusát.",
        variant: "destructive",
      });
      return;
    }

    submitRequestMutation.mutate({
      email,
      requestType,
      requestData: { details, timestamp: new Date().toISOString() }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/privacy-policy">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Vissza az adatvédelmi tájékoztatóhoz
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Adatvédelmi kérelmek
          </h1>
        </div>

        <div className="space-y-6">
          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Információ a kérelmekről</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-gray-600 dark:text-gray-300">
                A GDPR és a magyar adatvédelmi jogszabályok értelmében Önnek joga van:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li><strong>Hozzáférés:</strong> megtudni, hogy milyen adatait kezeljük</li>
                <li><strong>Helyesbítés:</strong> kérni pontatlan adatai javítását</li>
                <li><strong>Törlés:</strong> kérni adatai törlését (elfeledtetéshez való jog)</li>
                <li><strong>Korlátozás:</strong> kérni adatkezelés korlátozását bizonyos esetekben</li>
                <li><strong>Hordozhatóság:</strong> kérni adatai átadását géppel olvasható formátumban</li>
              </ul>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                ⏰ Válaszidő: 30 nap
              </p>
            </CardContent>
          </Card>

          {/* New Request Form */}
          <Card>
            <CardHeader>
              <CardTitle>Új kérelem benyújtása</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email cím *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                  />
                  <p className="text-sm text-gray-500">
                    Az email címre küldjük a válaszunkat és a kért adatokat.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Kérelem típusa *</Label>
                  <Select value={requestType} onValueChange={setRequestType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válasszon kérelem típust" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REQUEST_TYPES).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {config.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {requestType && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {REQUEST_TYPES[requestType as keyof typeof REQUEST_TYPES].description}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="details">További részletek</Label>
                  <Textarea
                    id="details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Írja le részletesen a kérelmét..."
                    rows={4}
                  />
                  <p className="text-sm text-gray-500">
                    Például: mely adatok javítása szükséges, mi a törlési kérelem oka, stb.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  disabled={submitRequestMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {submitRequestMutation.isPending ? 'Küldés...' : 'Kérelem beküldése'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing Requests */}
          {email && email.includes('@') && (
            <Card>
              <CardHeader>
                <CardTitle>Korábbi kérelmek</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-gray-500">Kérelmek betöltése...</p>
                ) : requests.length === 0 ? (
                  <p className="text-gray-500">Még nem nyújtott be kérelmet.</p>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request: PrivacyRequest) => {
                      const typeConfig = REQUEST_TYPES[request.requestType];
                      const statusConfig = STATUS_CONFIG[request.status];
                      const TypeIcon = typeConfig.icon;
                      const StatusIcon = statusConfig.icon;

                      return (
                        <div key={request.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <TypeIcon className="h-5 w-5 text-gray-600" />
                              <div>
                                <h4 className="font-medium">{typeConfig.label}</h4>
                                <p className="text-sm text-gray-500">
                                  Benyújtva: {new Date(request.createdAt).toLocaleDateString('hu-HU')}
                                </p>
                              </div>
                            </div>
                            
                            <Badge 
                              variant={statusConfig.color === 'green' ? 'default' : 'secondary'}
                              className={
                                statusConfig.color === 'green' ? 'bg-green-100 text-green-800' :
                                statusConfig.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                statusConfig.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>

                          {request.requestData?.details && (
                            <p className="text-sm text-gray-600 mt-2 pl-8">
                              {request.requestData.details}
                            </p>
                          )}

                          {request.completedAt && (
                            <p className="text-sm text-gray-500 mt-2 pl-8">
                              Lezárva: {new Date(request.completedAt).toLocaleDateString('hu-HU')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Kapcsolat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-gray-600 dark:text-gray-300">
                Kérdése van a kérelmeivel kapcsolatban? Vegye fel velünk a kapcsolatot:
              </p>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Email:</strong> privacy@globalsystem.com
                </p>
                <p className="text-sm">
                  <strong>Telefon:</strong> +36 1 234 5678
                </p>
                <p className="text-sm">
                  <strong>Postai cím:</strong> 1111 Budapest, Példa utca 1.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}