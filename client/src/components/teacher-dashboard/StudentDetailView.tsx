import { useQuery } from "@tanstack/react-query";
import { 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Award } from "lucide-react";
import { Student, Module } from "./types";

interface Props {
  student: Student;
}

export function StudentDetailView({ student }: Props) {
  const { data: modules = [] } = useQuery<Module[]>({
    queryKey: ["/api/public/modules"],
  });

  const getModuleName = (id: number) => modules.find(m => m.id === id)?.title || `Modul #${id}`;

  const getGrade = (score: number) => {
    if (score >= 90) return 5;
    if (score >= 65) return 4;
    if (score >= 55) return 3;
    if (score >= 45) return 2;
    return 1;
  };

  const getGradeColor = (grade: number) => {
    switch (grade) {
      case 5: return "text-green-600 font-bold";
      case 4: return "text-blue-600 font-bold";
      case 3: return "text-yellow-600 font-bold";
      case 2: return "text-orange-600 font-bold";
      default: return "text-red-600 font-bold";
    }
  };

  return (
    <div className="space-y-6">
      <DialogDescription>
        Részletes áttekintés a modulok teljesítéséről és a teszt eredményekről.
      </DialogDescription>

      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3 flex items-center">
          <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
          Teljesített modulok
        </h4>
        {student.completedModules && student.completedModules.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {student.completedModules
              .map((id: number) => modules.find((m: Module) => m.id === id))
              .filter((m: Module | undefined): m is Module => !!m)
              .sort((a: Module, b: Module) => a.moduleNumber - b.moduleNumber)
              .map((module: Module) => (
                <Badge key={`completed-${module.id}`} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 py-1">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {module.title}
                </Badge>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md border border-gray-100">
            Még nincsenek teljesített modulok.
          </p>
        )}
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3 flex items-center">
          <Award className="h-4 w-4 mr-2 text-purple-500" />
          Teszt eredmények
        </h4>
        {student.testResults && student.testResults.length > 0 ? (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-xs">Modul</TableHead>
                  <TableHead className="text-xs">Dátum</TableHead>
                  <TableHead className="text-xs">Pontszám</TableHead>
                  <TableHead className="text-xs">Osztályzat</TableHead>
                  <TableHead className="text-xs">Eredmény</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student.testResults.map((result: any) => {
                  const grade = getGrade(result.score);
                  return (
                    <TableRow key={result.id}>
                      <TableCell className="text-xs font-medium">
                        {getModuleName(result.moduleId)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(result.createdAt).toLocaleDateString('hu-HU')}
                      </TableCell>
                      <TableCell className="text-xs">
                        {result.score}%
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className={getGradeColor(grade)}>
                          {grade}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {result.passed ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 text-[10px] py-0 px-1.5">
                            Sikeres
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                            Sikertelen
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md border border-gray-100">
            Nincsenek elérhető teszt eredmények.
          </p>
        )}
      </div>
    </div>
  );
}
