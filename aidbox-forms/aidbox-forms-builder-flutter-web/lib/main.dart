import 'package:flutter/material.dart';
import 'dart:html' as html;
import 'dart:ui_web' as ui;

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Aidbox Builder Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MyHomePage(),
    );
  }
}


class AidboxBuilderWidget extends StatelessWidget {
  final String url;

  AidboxBuilderWidget(this.url);

  @override
  Widget build(BuildContext context) {
    // Register the iframe view factory
    ui.platformViewRegistry.registerViewFactory(
      url,
      (int viewId) => html.IFrameElement()
        ..src = url
        ..allow = 'microphone *'
        ..style.border = 'none'
        ..style.height = '100%'
        ..style.width = '100%',
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        return SizedBox(
          width: constraints.maxWidth,
          height: constraints.maxHeight,
          child: HtmlElementView(
            viewType: url,
          ),
        );
      },
    );
  }
}

class MyHomePage extends StatelessWidget {
  const MyHomePage({super.key});

  final String url = 'https://<your-aidbox-instance-host>/ui/sdc#/forms/builder?form=<form-id>&token=<auth-token>';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: const Text('Aidbox Builder Demo'),
      ),
      drawer: Drawer(
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.zero,
        ),
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const DrawerHeader(
              decoration: BoxDecoration(
                color: Colors.deepPurple,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Aidbox Builder',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                    ),
                  ),
                  Text(
                    'Demo',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.question_answer),
              title: const Text('Questionnaires'),
              onTap: () {
                // Handle navigation to Questionnaires
                Navigator.pop(context); // Close the drawer
              },
            ),
            ListTile(
              leading: const Icon(Icons.people),
              title: const Text('Clients'),
              onTap: () {
                // Handle navigation to Clients
                Navigator.pop(context); // Close the drawer
              },
            ),
            ListTile(
              leading: const Icon(Icons.receipt),
              title: const Text('Questionnaire Response'),
              onTap: () {
                // Handle navigation to Questionnaire Response
                Navigator.pop(context); // Close the drawer
              },
            ),
          ],
        ),
      ),
      body: Center(
        child: AidboxBuilderWidget(url),
      ),
    );
  }
}
