import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Printer, ChevronDown, ChevronUp, Clock, AlertTriangle } from "lucide-react";
import { ClassData as Class } from "./types";

interface Props {
  teacherClasses: Class[];
  rosterClassId: string;
  setRosterClassId: (val: string) => void;
  rosterPeriod: string;
  setRosterPeriod: (val: any) => void;
  rosterPrintDetails: boolean;
  setRosterPrintDetails: (val: boolean) => void;
  rosterCustomStart: string;
  setRosterCustomStart: (val: string) => void;
  rosterCustomEnd: string;
  setRosterCustomEnd: (val: string) => void;
  rosterData: any;
  rosterExpandedStudents: Set<string>;
  setRosterExpandedStudents: (val: Set<string>) => void;
}

export function RosterView({
  teacherClasses,
  rosterClassId,
  setRosterClassId,
  rosterPeriod,
  setRosterPeriod,
  rosterPrintDetails,
  setRosterPrintDetails,
  rosterCustomStart,
  setRosterCustomStart,
  rosterCustomEnd,
  setRosterCustomEnd,
  rosterData,
  rosterExpandedStudents,
  setRosterExpandedStudents
}: Props) {
  
  const toggleStudent = (id: string) => {
    const next = new Set(rosterExpandedStudents);
    next.has(id) ? next.delete(id) : next.add(id);
    setRosterExpandedStudents(next);
  };

  return (
    <div className="space-y-6">
      <style>{`@media print{.no-print{display:none!important}.print-only{display:block!important}body{background:white}}`}</style>

      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-blue-600" />
            Osztálynévsor – Nyomtatható nézet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-sm font-medium mb-1 block">Osztály</label>
              <Select value={rosterClassId} onValueChange={setRosterClassId}>
                <SelectTrigger><SelectValue placeholder="Válasszon osztályt..." /></SelectTrigger>
                <SelectContent>
                  {teacherClasses.map(cls => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Időszak</label>
              <Select value={rosterPeriod} onValueChange={setRosterPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Elmúlt 7 nap (heti)</SelectItem>
                  <SelectItem value="4weeks">Elmúlt 4 hét</SelectItem>
                  <SelectItem value="month">Elmúlt hónap</SelectItem>
                  <SelectItem value="custom">Egyéni dátumtartomány</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 h-10 pb-2">
              <Checkbox id="print-details" checked={rosterPrintDetails} onCheckedChange={(c) => setRosterPrintDetails(!!c)} />
              <Label htmlFor="print-details" className="text-sm font-medium cursor-pointer">Részletes eredmények</Label>
            </div>
            <div className="flex items-end">
              <Button className="w-full bg-blue-600" onClick={() => window.print()} disabled={!rosterData}>
                <Printer className="h-4 w-4 mr-2" /> Nyomtatás
              </Button>
            </div>
          </div>

          {rosterPeriod === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <Input type="date" value={rosterCustomStart} onChange={e => setRosterCustomStart(e.target.value)} />
              <Input type="date" value={rosterCustomEnd} onChange={e => setRosterCustomEnd(e.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>

      {rosterData ? (
        <div className="bg-white p-6 rounded-lg border shadow-sm print:shadow-none print:border-none print:p-0">
          <div className="flex items-center justify-between mb-6">
             <div>
                <h2 className="text-2xl font-bold text-gray-900">{rosterData.className}</h2>
                <p className="text-gray-500">Időszak: {new Date(rosterData.startDate).toLocaleDateString()} - {new Date(rosterData.endDate).toLocaleDateString()}</p>
             </div>
             <Badge className="bg-blue-100 text-blue-700">{rosterData.students.length} tanuló</Badge>
          </div>

          <Table>
             <TableHeader>
                <TableRow>
                   <TableHead>Név</TableHead>
                   <TableHead>Jelenlét (óra)</TableHead>
                   <TableHead>Modulok</TableHead>
                   <TableHead className="no-print">Művelet</TableHead>
                </TableRow>
             </TableHeader>
              <TableBody>
                {rosterData.students.map((s: any) => (
                   <React.Fragment key={s.id}>
                      <TableRow>
                         <TableCell className="font-medium">{s.lastName} {s.firstName}</TableCell>
                         <TableCell>{s.stats?.attendanceCount || 0} óra</TableCell>
                         <TableCell>{s.stats?.completedCount || 0} db</TableCell>
                         <TableCell className="no-print">
                            <Button variant="ghost" size="sm" onClick={() => toggleStudent(s.id)}>
                               {rosterExpandedStudents.has(s.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                         </TableCell>
                      </TableRow>
                      {(rosterExpandedStudents.has(s.id) || rosterPrintDetails) && (
                         <TableRow key={`exp-${s.id}`} className={rosterPrintDetails ? 'print-only' : ''}>
                            <TableCell colSpan={4} className="bg-gray-50 p-4">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                     <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Tesztek</h4>
                                     <div className="space-y-1">
                                        {(s.testResults || []).map((tr: any) => (
                                           <div key={tr.id} className="text-xs flex justify-between">
                                              <span>{tr.moduleTitle || `Modul #${tr.moduleId}`}</span>
                                              <span className="font-bold">{tr.score}% ({tr.grade})</span>
                                           </div>
                                        ))}
                                     </div>
                                  </div>
                               </div>
                            </TableCell>
                         </TableRow>
                      )}
                   </React.Fragment>
                ))}
              </TableBody>
          </Table>
        </div>
      ) : (
        <Card className="no-print border-dashed text-center py-20">
           <AlertTriangle className="h-10 w-10 mx-auto text-gray-300 mb-3" />
           <p className="text-gray-500">Válasszon osztályt a névsor megtekintéséhez.</p>
        </Card>
      )}
    </div>
  );
}
