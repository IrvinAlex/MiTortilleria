package com.mi.tortilleria;

import android.os.Bundle;

import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {


  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Registra el plugin de GoogleAuth
    registerPlugin(
      com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth.class
    );
  }

}
