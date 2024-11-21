"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Play, Stethoscope, User } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import useLocalStorageState from "use-local-storage-state";
import { SMART_LAUNCH_CLIENT_ID, SMART_LAUNCH_SCOPES } from "@/lib/constants";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { createSmartAppLauncherUrl } from "@/lib/utils";

export default function Page() {
  const { toast } = useToast();
  const [instructionsVisible, setInstructionsVisible] = useState(false);

  const [tab, setTab] = useLocalStorageState("welcome-tab", {
    defaultValue: "ehr",
  });
  const [issuer, setIssuer, { removeItem: resetIssuer }] = useLocalStorageState(
    "issuer",
    {
      defaultValue: "",
    },
  );
  const [scope, setScope, { removeItem: resetScope }] = useLocalStorageState(
    "scope",
    {
      defaultValue: SMART_LAUNCH_SCOPES.join("\n"),
    },
  );

  const launchUrl = new URL("/api/launch/authorize", window.location.href);

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
                  {SMART_LAUNCH_CLIENT_ID}
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
        </DialogContent>
      </Dialog>
      <div className="mb-4"></div>

      <div className="flex flex-col items-center gap-8 max-w-[24rem] mx-auto">
        <Image
          src={"/health-samurai.svg"}
          alt={"Health Samurai"}
          width={64}
          height={64}
        />

        <h1 className="text-2xl font-bold text-center text-pretty">
          Welcome to Aidbox Forms Smart App
        </h1>

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
                <form
                  method="post"
                  action="/api/launch/authorize"
                  onSubmit={(event) => {
                    const joinedScope = scope
                      ?.split("\n")
                      ?.map((s) => s.trim())
                      ?.filter(Boolean)
                      ?.join(" ");

                    if (!issuer || !joinedScope) {
                      event.preventDefault();
                      toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Issuer and Scope are required",
                      });
                    }
                  }}
                >
                  <input type="hidden" name="scope" value={scope} />

                  <CardContent className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="name">Issuer</Label>
                      <Input
                        name="issuer"
                        value={issuer}
                        onChange={(e) => setIssuer(e.target.value)}
                      />
                    </div>

                    <CollapsibleContent className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="name">Scope</Label>
                        <Textarea
                          name="scope"
                          value={scope}
                          onChange={(e) => setScope(e.target.value)}
                          rows={10}
                        />
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                  <CardFooter className="justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        resetIssuer();
                        resetScope();
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      type="submit"
                      disabled={!issuer || !scope}
                      variant="outline"
                    >
                      <Play className="text-primary my-4" />
                      Launch
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </Collapsible>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
