import { Button } from "@/ui/button.jsx";
import { ChevronsUpDown, Play, Stethoscope, User } from "lucide-react";
import { createSmartAppLauncherUrl } from "@/lib/utils.js";
import { authorize, clientId, defaultScope } from "@/hooks/use-client.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/card.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs.jsx";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog.jsx";
import { Input } from "@/ui/input.jsx";
import { Label } from "@/ui/label.jsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/ui/collapsible.jsx";
import { Textarea } from "@/ui/textarea.jsx";
import { useToast } from "@/hooks/use-toast.js";
import useLocalStorageState from "use-local-storage-state";
import logo from "/health-samurai.svg";

export const Welcome = () => {
  const { toast } = useToast();
  const [instructionsVisible, setInstructionsVisible] = useState(false);

  const [tab, setTab] = useLocalStorageState("welcome-tab", {
    defaultValue: "ehr",
  });
  const [issuer, setIssuer, { removeItem: resetIssuer }] =
    useLocalStorageState("issuer");
  const [scope, setScope, { removeItem: resetScope }] = useLocalStorageState(
    "scope",
    {
      defaultValue: defaultScope.join("\n"),
    },
  );

  const launchUrl = new URL(window.location);
  launchUrl.search = "";

  return (
    <>
      <Dialog open={instructionsVisible} onOpenChange={setInstructionsVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instructions</DialogTitle>
          </DialogHeader>

          <div className="mb-4 text-sm">
            To run this app from within your own EHR system, you can register it
            as a SMART App with the following parameters:
            <ul className="list-disc ml-6 mt-2">
              <li>
                <span className="font-semibold">Launch URL:</span>{" "}
                <code className="bg-black text-white px-1 py-0.5 rounded text-xs">
                  {launchUrl.toString()}
                </code>
              </li>
              <li>
                <span className="font-semibold">Redirect URL:</span>{" "}
                <code className="bg-black text-white px-1 py-0.5 rounded text-xs">
                  {launchUrl.toString()}
                </code>
              </li>
              <li>
                <span className="font-semibold">Client ID:</span>{" "}
                <code className="bg-black text-white px-1 py-0.5 rounded text-xs">
                  {clientId}
                </code>
              </li>
              <li>
                <span className="font-semibold">PKCE:</span>{" "}
                <code className="bg-black text-white px-1 py-0.5 rounded text-xs">
                  true
                </code>
              </li>
            </ul>
          </div>
          <div className="mb-4">
            All pages in this app can serve as entry points. For example, you
            can directly access a form filling page for a patient using a
            Launch/Redirect URL like this:
            <br />
            <code className="bg-black text-white px-1 py-0.5 rounded text-xs">
              /questionnaire-response/[your-id]
            </code>
          </div>
        </DialogContent>
      </Dialog>
      <div className="mb-4"></div>

      <div className="flex flex-col items-center gap-8 max-w-[24rem] mx-auto">
        <img alt="Health Samurai" src={logo} width="64" />

        <h1 className="text-2xl font-bold text-center text-pretty">
          Welcome to Aidbox Forms Smart App
        </h1>

        <div className="text-sm">
          This is a demo smart app for launching Aidbox Forms
        </div>

        <Tabs
          defaultValue="account"
          className="w-full"
          value={tab}
          onValueChange={setTab}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ehr">EHR Launch</TabsTrigger>
            <TabsTrigger value="standalone">Standalone Launch</TabsTrigger>
          </TabsList>
          <TabsContent value="ehr">
            <Card>
              <CardHeader>
                <CardTitle>Heads up!</CardTitle>
                <CardDescription className="space-y-2">
                  <p>
                    If you’re seeing this page, it means the app wasn’t launched
                    with the correct context.
                  </p>
                  <p>
                    Please refer to the{" "}
                    <Button
                      variant="link"
                      className="underline p-0 h-auto"
                      onClick={() => setInstructionsVisible(true)}
                    >
                      instructions
                    </Button>{" "}
                    for registering the app in your EHR.
                  </p>
                  <p>
                    Alternatively, use one of the following links to simulate
                    launching the app from:
                  </p>
                </CardDescription>
              </CardHeader>
              <CardFooter className="gap-2">
                <Button variant="outline" className="flex-1" asChild={true}>
                  <a
                    href={createSmartAppLauncherUrl({
                      launchUrl,
                      launchType: "provider-ehr",
                    })}
                  >
                    <Stethoscope className="text-primary my-4" />
                    Provider EHR
                  </a>
                </Button>
                <Button variant="outline" className="flex-1" asChild={true}>
                  <a
                    href={createSmartAppLauncherUrl({
                      launchUrl,
                      launchType: "patient-portal",
                    })}
                  >
                    <User className="text-primary my-4" />
                    Patient Portal
                  </a>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="standalone">
            <Collapsible>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Launch Parameters
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-9 p-0">
                        <ChevronsUpDown className="h-4 w-4" />
                        <span className="sr-only">Toggle</span>
                      </Button>
                    </CollapsibleTrigger>
                  </CardTitle>
                  <CardDescription>
                    Use the following parameters to launch the app standalone:
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="name">Issuer</Label>
                    <Input
                      value={issuer}
                      onChange={(e) => setIssuer(e.target.value)}
                    />
                  </div>

                  <CollapsibleContent className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="name">Scope</Label>
                      <Textarea
                        value={scope}
                        onChange={(e) => setScope(e.target.value)}
                        rows={10}
                      />
                    </div>
                  </CollapsibleContent>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      resetIssuer();
                      resetScope();
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    disabled={!issuer || !scope}
                    variant="outline"
                    onClick={() => {
                      const joinedScope = scope
                        ?.split("\n")
                        ?.map((s) => s.trim())
                        ?.filter(Boolean)
                        ?.join(" ");

                      if (!issuer || !joinedScope) {
                        toast({
                          variant: "destructive",
                          title: "Error",
                          description: "Issuer and Scope are required",
                        });
                      } else {
                        void authorize({ iss: issuer, scope: joinedScope });
                      }
                    }}
                  >
                    <Play className="text-primary my-4" />
                    Launch
                  </Button>
                </CardFooter>
              </Card>
            </Collapsible>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};
